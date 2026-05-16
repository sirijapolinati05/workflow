import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchUsers, markNotificationsAsReadByType } from "@/features/dashboard/api";

import { CollectionPage } from "./CollectionPage";
import { type DirectoryUser, splitUsersByRole } from "./people-utils";

export function PeoplePage() {
  const users = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
  const people = splitUsersByRole((users.data?.items ?? []) as DirectoryUser[]);

  useEffect(() => {
    // Clear people notifications when visiting the page
    markNotificationsAsReadByType("NEW_USER").catch(console.error);
  }, []);

  return (
    <CollectionPage
      title="Team Management"
      subtitle="Admin and employee visibility with clear role grouping"
      items={[...people.admins, ...people.employees]}
      render={(employee, index) => (
        <div key={employee.id}>
          {index === 0 ? (
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Admin</h3>
          ) : null}
          {index === people.admins.length && people.employees.length ? (
            <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
              Employees
            </h3>
          ) : null}
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">{employee.full_name}</p>
            <p className="text-sm text-slate-500">
              {employee.profile?.department ?? employee.job_title ?? "No department"}
            </p>
          </div>
        </div>
      )}
    />
  );
}
