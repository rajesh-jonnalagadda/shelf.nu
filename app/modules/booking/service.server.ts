import {
  type Booking,
  type Prisma,
  type Organization,
  type Asset,
  BookingStatus,
} from "@prisma/client";
import { db } from "~/database";

const commonInclude: Prisma.BookingInclude = {
  custodianTeamMember: true,
  custodianUser: true,
};
//client should pass new Date().toIsoString() to action handler for to and from
export const upsertBooking = async (
  booking: Partial<
    Pick<
      Booking,
      | "from"
      | "id"
      | "creatorId"
      | "name"
      | "organizationId"
      | "status"
      | "to"
      | "custodianTeamMemberId"
      | "custodianUserId"
    > & { assetIds: Asset["id"][] }
  >
) => {
  const {
    assetIds,
    creatorId,
    organizationId,
    custodianTeamMemberId,
    custodianUserId,
    id,
    ...rest
  } = booking;
  let data: Prisma.BookingUpdateInput = { ...rest };
  if (assetIds?.length) {
    data.assets = {
      connect: assetIds.map((id) => ({
        id,
      })),
    };
  }
  if (custodianUserId) {
    data.custodianUser = {
      connect: { id: custodianUserId },
    };
    //to change custodian
    data.custodianTeamMember = {
      disconnect: true,
    };
  } else if (custodianTeamMemberId) {
    data.custodianTeamMember = {
      connect: { id: custodianTeamMemberId },
    };
    data.custodianUser = {
      disconnect: true,
    };
  }

  if (id) {
    //update
    return await db.booking.update({
      where: { id },
      data,
      include: commonInclude,
    });
  }

  //only while creating we can connect creator and org, updating is not allowed
  if (creatorId) {
    data.creator = {
      connect: { id: creatorId },
    };
  }
  if (organizationId) {
    data.organization = {
      connect: { id: organizationId },
    };
  }

  return db.booking.create({
    data: data as Prisma.BookingCreateInput,
    include: commonInclude,
  });
};

export async function getBookings({
  organizationId,
  page = 1,
  perPage = 8,
  search,
  statuses,
  custodianUserId,
  custodianTeamMemberId,
  assetIds,
  bookingTo,
  excludeBookingIds,
  bookingFrom,
}: {
  organizationId: Organization["id"];

  /** Page number. Starts at 1 */
  page: number;

  /** Assets to be loaded per page */
  perPage?: number;

  search?: string | null;

  statuses?: Booking["status"][] | null;
  assetIds?: Asset["id"][] | null;
  custodianUserId?: Booking["custodianUserId"] | null;
  custodianTeamMemberId?: Booking["custodianTeamMemberId"] | null;
  excludeBookingIds?: Booking["id"][] | null;
  bookingFrom?: Booking["from"] | null;
  bookingTo?: Booking["to"] | null;
}) {
  const skip = page > 1 ? (page - 1) * perPage : 0;
  const take = perPage >= 1 && perPage <= 100 ? perPage : 20; // min 1 and max 25 per page

  /** Default value of where. Takes the assetss belonging to current org */
  let where: Prisma.BookingWhereInput = { organizationId };

  /** If the search string exists, add it to the where object */
  if (search?.trim()?.length) {
    where.name = {
      contains: search.trim(),
      mode: "insensitive",
    };
  }
  if (custodianTeamMemberId) {
    where.custodianTeamMemberId = custodianTeamMemberId;
  }
  if (custodianUserId) {
    where.custodianUserId = custodianUserId;
  }
  if (statuses?.length) {
    where.status = {
      in: statuses,
    };
  }

  if (assetIds?.length) {
    where.assets = {
      some: {
        id: {
          in: assetIds,
        },
      },
    };
  }

  if (excludeBookingIds?.length) {
    where.id = { notIn: excludeBookingIds };
  }
  if (bookingFrom && bookingTo) {
    where.OR = [
      {
        from: { lte: bookingTo },
        to: { gte: bookingFrom },
      },
      {
        from: { gte: bookingFrom },
        to: { lte: bookingTo },
      },
    ];
  }

  const [bookings, bookingCount] = await Promise.all([
    db.booking.findMany({
      skip,
      take,
      where,
      include: commonInclude,
      orderBy: { createdAt: "desc" },
    }),
    db.booking.count({ where }),
  ]);

  return { bookings, bookingCount };
}

export const removeAssets = async (
  booking: Pick<Booking, "id"> & { assetIds: Asset["id"][] }
) => {
  const { assetIds, id } = booking;

  return db.booking.update({
    where: { id },
    include: commonInclude,
    data: {
      assets: {
        disconnect: assetIds.map((id) => ({ id })),
      },
    },
  });
};

export const deleteBooking = async (booking: Pick<Booking, "id">) => {
  const { id } = booking;

  const b = await db.booking.delete({
    where: { id },
    include: { ...commonInclude, assets: true },
  });
  if (
    (
      [BookingStatus.ONGOING, BookingStatus.OVERDUE] as BookingStatus[]
    ).includes(b.status)
  ) {
    //@TODO check if asset is ongoing in some other booking(only in case of overdue) and update status
  }
  return b;
};

export const getBooking = async (booking: Pick<Booking, "id">) => {
  const { id } = booking;

  return db.booking.findFirst({
    where: { id },
    include: { ...commonInclude, assets: true },
  });
};
