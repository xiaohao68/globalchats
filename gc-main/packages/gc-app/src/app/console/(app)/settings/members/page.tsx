import MembersTable from "./components/members-table";

export default async function Page() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
      </div>
      <MembersTable />
    </div>
  );
}
