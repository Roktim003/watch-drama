import TitleForm from "@/components/admin/TitleForm";

export const metadata = { title: { absolute: "New Title — WatchDrama Admin" } };

export default function NewTitlePage() {
  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-white">Add a new title</h1>
      <TitleForm initial={null} />
    </div>
  );
}
