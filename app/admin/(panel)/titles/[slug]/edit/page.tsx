import { notFound } from "next/navigation";

export const instant = false;
import { connection } from "next/server";
import { getTitle } from "@/lib/store";
import TitleForm from "@/components/admin/TitleForm";

export const metadata = { title: "Edit Title — WatchDrama Admin" };

export default async function EditTitlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const title = await getTitle(slug);
  if (!title) notFound();
  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-white">
        Edit — <span className="text-red-400">{title.name}</span>
      </h1>
      <TitleForm initial={title} />
    </div>
  );
}
