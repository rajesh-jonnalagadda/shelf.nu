import type { ActionArgs, LoaderArgs, V2_MetaFunction } from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import { Form, useCatch, useLoaderData } from "@remix-run/react";
import type { HeaderData } from "~/components/layout/header/types";
import { Button } from "~/components/shared/button";

import { requireAuthSession, commitAuthSession } from "~/modules/auth";
import { deleteItem, getItem } from "~/modules/item";
import { assertIsDelete, getRequiredParam } from "~/utils";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";

export async function loader({ request, params }: LoaderArgs) {
  const { userId } = await requireAuthSession(request);

  const id = getRequiredParam(params, "itemId");

  const item = await getItem({ userId, id });
  if (!item) {
    throw new Response("Not Found", { status: 404 });
  }

  const header: HeaderData = {
    title: item.title,
    subHeading: item.id,
  };

  return json({ item, header });
}

export const meta: V2_MetaFunction<typeof loader> = ({ data }) => [
  { title: appendToMetaTitle(data.header.title) },
];

export const handle = {
  breadcrumb: () => "single",
};

export async function action({ request, params }: ActionArgs) {
  assertIsDelete(request);
  const id = getRequiredParam(params, "itemId");
  const authSession = await requireAuthSession(request);

  await deleteItem({ userId: authSession.userId, id });

  return redirect("/items", {
    headers: {
      "Set-Cookie": await commitAuthSession(request, { authSession }),
    },
  });
}

export default function ItemDetailsPage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className=" items-top flex justify-between">
      <p className="py-6">{data.item.description}</p>
      <Form method="delete">
        <Button variant="secondary" type="submit">
          Delete
        </Button>
      </Form>
    </div>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  return <div>An unexpected error occurred: {error.message}</div>;
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 404) {
    return <div>Item not found</div>;
  }

  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}
