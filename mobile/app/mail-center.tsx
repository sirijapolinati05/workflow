import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { AppCard } from "@/components/card";
import { Heading } from "@/components/heading";
import { Screen } from "@/components/screen";
import { fetchReports } from "@/features/mail/api";

export default function MailCenterScreen() {
  const reports = useQuery({ queryKey: ["reports"], queryFn: fetchReports });
  return (
    <Screen>
      <Heading title="Mail Center" subtitle="Internal documents, shared report threads, and operational communication" />
      <View className="gap-4">
        {(reports.data ?? []).map((report: any) => (
          <AppCard key={report.id}>
            <Text className="text-base font-semibold text-slate-950">{report.name}</Text>
            <Text className="mt-2 text-sm text-slate-500">{report.report_type}</Text>
          </AppCard>
        ))}
      </View>
    </Screen>
  );
}

