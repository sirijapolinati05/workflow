export type DirectoryUser = {
  id: string;
  full_name: string;
  role: string;
  job_title?: string | null;
  avatar_url?: string | null;
  profile?: {
    department?: string | null;
  } | null;
};

export function splitUsersByRole(items: DirectoryUser[]) {
  const admins = items.filter((item) => item.role !== "EMPLOYEE");
  const employees = items.filter((item) => item.role === "EMPLOYEE");
  return { admins, employees };
}

export function PeopleSection({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: DirectoryUser[];
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{title}</h4>
      <div className="mt-3 space-y-3">
        {items.length ? (
          items.map((person) => (
            <div key={person.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
              <div>
                <p className="font-medium text-slate-900">{person.full_name}</p>
                <p className="text-sm text-slate-500">
                  {person.profile?.department ?? person.job_title ?? "Unassigned"}
                </p>
              </div>
              <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                {person.role}
              </span>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}
