import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";

import { AppCard } from "@/components/card";
import { Heading } from "@/components/heading";
import { Screen } from "@/components/screen";
import { createSubmission } from "@/features/tasks/api";
import { useSessionStore } from "@/store/session-store";

type SubmissionFormValues = {
  title: string;
  description: string;
  category: string;
  priority: string;
  deployment_link: string;
  github_pr_link: string;
};

export default function NewSubmissionScreen() {
  const user = useSessionStore((state) => state.user);
  const { watch, setValue, handleSubmit } = useForm<SubmissionFormValues>({
    defaultValues: {
      title: "",
      description: "",
      category: "Daily Update",
      priority: "MEDIUM",
      deployment_link: "",
      github_pr_link: "",
    },
  });
  const mutation = useMutation({
    mutationFn: (values: Record<string, string>) =>
      createSubmission({
        ...values,
        submitted_by_id: user?.id,
        deployment_link: values.deployment_link || undefined,
        github_pr_link: values.github_pr_link || undefined,
      }),
    onSuccess: () => router.back(),
  });

  return (
    <Screen>
      <Heading title="Submit Work" subtitle="Daily updates, reports, deployments, and documentation" />
      <AppCard>
        <View className="gap-4">
          {["title", "description", "category", "priority", "deployment_link", "github_pr_link"].map((field) => (
            <TextInput
              key={field}
              value={watch(field as never)}
              onChangeText={(value) => setValue(field as never, value as never)}
              placeholder={field.replaceAll("_", " ")}
              multiline={field === "description"}
              className="rounded-2xl border border-slate-200 px-4 py-4"
            />
          ))}
          <Pressable className="rounded-2xl bg-blue-600 px-4 py-4" onPress={handleSubmit((values) => mutation.mutate(values))}>
            <Text className="text-center font-semibold text-white">Submit</Text>
          </Pressable>
        </View>
      </AppCard>
    </Screen>
  );
}
