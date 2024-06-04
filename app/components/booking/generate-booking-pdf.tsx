import { useRef, useState } from "react";
import type { Asset, Booking } from "@prisma/client";
import { Button } from "~/components/shared/button";

import { tw } from "~/utils/tw";
import { Dialog, DialogPortal } from "../layout/dialog";
import { Spinner } from "../shared/spinner";

export const GenerateBookingPdf = ({
  booking,
}: {
  booking: {
    id: Booking["id"];
    name: Booking["name"];
    assets: Partial<Asset>[];
  };
}) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null); // Add ref for the iframe
  const totalAssets = booking.assets.length;
  const url = useRef("");
  const handleIframeLoad = () => {
    setIframeLoaded(true);
  };

  const handleMobileView = () => {
    window.location.href = url.current;
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    url.current = `/bookings/${booking.id.toString()}/generate-pdf/booking-checklist-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf?timeStamp=${new Date().getTime()}`;
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleDownload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      e.preventDefault();
      const iframe = iframeRef.current;
      const src = iframe?.src;
      if (src) {
        const response = await fetch(src);

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const pdfBlob = await response.blob();

        // Create a download link and click it
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `booking-checklist-${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (err) {
      //do nothing for now.
    }
  };

  return (
    <>
      <Button
        variant="link"
        className="hidden justify-start rounded-sm px-2 py-1.5 text-left text-sm font-medium text-gray-700 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-slate-100 hover:text-gray-700 md:block"
        width="full"
        name="generate pdf"
        onClick={handleOpenDialog}
        disabled={!totalAssets}
      >
        Generate overview PDF
      </Button>
      <DialogPortal>
        <Dialog
          open={isDialogOpen}
          onClose={handleCloseDialog}
          className="h-[90vh] w-full py-0 md:h-[calc(100vh-4rem)]  md:w-[90%]"
          title={
            <div>
              <h3>Generate booking checklist for "{booking?.name}"</h3>
              <p>You can either preview or download the PDF.</p>
            </div>
          }
        >
          <div className="flex h-full flex-col px-6">
            <div className="grow">
              {/** Show spinner if no iframe */}
              {!iframeLoaded && url && (
                <div className="m-4  flex h-full flex-1 flex-col items-center justify-center text-center">
                  <Spinner />
                  <p className="mt-2">Generating PDF...</p>
                </div>
              )}
              {totalAssets && (
                <div
                  className={tw(iframeLoaded ? "block" : "hidden", "h-full")}
                >
                  <iframe
                    id="pdfPreview"
                    ref={iframeRef}
                    width="100%"
                    height="100%"
                    onLoad={handleIframeLoad}
                    src={url.current}
                    title="Booking PDF"
                    allowFullScreen={true}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 py-4">
              <Button variant="secondary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                disabled={!iframeLoaded}
                icon="download"
                onClick={handleDownload}
              >
                Download
              </Button>
            </div>
          </div>
        </Dialog>
      </DialogPortal>

      {/* Only for mobile */}
      <Button
        variant="link"
        className="block justify-start rounded-sm px-2 py-1.5 text-left text-sm font-medium text-gray-700 outline-none hover:bg-slate-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-50 md:hidden"
        width="full"
        name="generate pdf"
        disabled={!totalAssets}
        onClick={handleMobileView}
      >
        Generate overview PDF
      </Button>
    </>
  );
};
