import { useForm } from "react-hook-form";
import { Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { AppCard } from "@/components/card";
import { Heading } from "@/components/heading";
import { Screen } from "@/components/screen";
import { login } from "@/features/auth/api";

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginScreen() {
  const { setValue, watch, handleSubmit } = useForm<LoginFormValues>({
    defaultValues: { email: "superadmin@workflowpro.com", password: "ChangeMe123!" },
  });

  return (
    <Screen>
      <View className="mt-12 gap-6">
        <Heading title="WorkFlow Pro" subtitle="Secure employee workspace" />
        <AppCard>
          <View className="gap-4">
            <TextInput
              className="rounded-2xl border border-slate-200 px-4 py-4"
              value={watch("email")}
              onChangeText={(value) => setValue("email", value)}
              placeholder="Work email"
            />
            <TextInput
              secureTextEntry
              className="rounded-2xl border border-slate-200 px-4 py-4"
              value={watch("password")}
              onChangeText={(value) => setValue("password", value)}
              placeholder="Password"
            />
            <Pressable
              className="rounded-2xl bg-blue-600 px-4 py-4"
              onPress={handleSubmit(async (values) => {
                await login(values.email, values.password);
                router.replace("/(tabs)");
              })}
            >
              <Text className="text-center font-semibold text-white">Sign In</Text>
            </Pressable>
          </View>
        </AppCard>
      </View>
    </Screen>
  );
}
