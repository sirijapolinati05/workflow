import { Pressable, Text, View, Image, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "@/features/auth/api";

import { AppCard } from "@/components/card";
import { Heading } from "@/components/heading";
import { Screen } from "@/components/screen";
import { useSessionStore } from "@/store/session-store";

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);
  const clear = useSessionStore((state) => state.clear);

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      Alert.alert("Success", "Profile picture updated!");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: any) => {
      Alert.alert("Error", error.response?.data?.message || "Failed to update profile");
    }
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      mutation.mutate({ avatar_url: base64Image });
    }
  };

  return (
    <Screen>
      <Heading title="Profile" subtitle="Account, role, and activity access" />
      <AppCard>
        <View className="items-center pb-6">
          <View className="relative">
            <View className="h-32 w-32 items-center justify-center overflow-hidden rounded-[2.5rem] bg-slate-100 border-4 border-white shadow-xl">
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} className="h-full w-full" />
              ) : (
                <Ionicons name="person" size={48} color="#cbd5e1" />
              )}
            </View>
            <Pressable 
              className="absolute -bottom-2 -right-2 rounded-2xl bg-blue-600 p-3 shadow-lg active:scale-95"
              onPress={pickImage}
              disabled={mutation.isPending}
            >
              <Ionicons name={mutation.isPending ? "sync" : "camera"} size={18} color="white" />
            </Pressable>
          </View>
          
          <Text className="mt-6 text-2xl font-bold text-slate-900">{user?.full_name}</Text>
          <Text className="text-sm font-medium text-slate-500">{user?.email}</Text>
          
          <View className="mt-4 flex-row gap-2">
            <View className="rounded-lg bg-emerald-50 px-3 py-1">
              <Text className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Active</Text>
            </View>
            <View className="rounded-lg bg-blue-50 px-3 py-1">
              <Text className="text-[10px] font-black uppercase tracking-wider text-blue-600">{user?.role}</Text>
            </View>
          </View>
        </View>

        <View className="mt-4 gap-4 border-t border-slate-100 pt-6">
          <View className="flex-row items-center gap-3">
            <Ionicons name="briefcase-outline" size={18} color="#64748b" />
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Job Title</Text>
              <Text className="text-sm font-semibold text-slate-700">{user?.job_title ?? "Employee"}</Text>
            </View>
          </View>
          
          <View className="flex-row items-center gap-3">
            <Ionicons name="shield-checkmark-outline" size={18} color="#64748b" />
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</Text>
              <Text className="text-sm font-semibold text-slate-700">{user?.status ?? "ACTIVE"}</Text>
            </View>
          </View>
        </View>
      </AppCard>
      <Pressable
        className="rounded-2xl bg-slate-900 px-4 py-4"
        onPress={() => {
          clear();
          router.replace("/(auth)/login");
        }}
      >
        <Text className="text-center font-semibold text-white">Sign Out</Text>
      </Pressable>
    </Screen>
  );
}

