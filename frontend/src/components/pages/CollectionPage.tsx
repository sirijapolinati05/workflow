import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type CollectionPageProps<T> = {
  title: string;
  subtitle: string;
  items?: T[];
  headerContent?: ReactNode;
  contentBeforeItems?: ReactNode;
  render?: (item: T, index: number) => ReactNode;
  children?: ReactNode;
};

export function CollectionPage<T>({
  title,
  subtitle,
  items = [],
  headerContent,
  contentBeforeItems,
  render,
  children,
}: CollectionPageProps<T>) {
  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        {headerContent ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{headerContent}</div> : null}
      </div>
      <div className="mt-6">
        {contentBeforeItems}
        {children}
        <div className="space-y-3">
          {render && items.map((item, index) => render(item, index))}
        </div>
      </div>
    </Card>
  );
}
