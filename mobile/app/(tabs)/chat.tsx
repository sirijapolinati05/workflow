import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { AppCard } from "@/components/card";
import { Heading } from "@/components/heading";
import { Screen } from "@/components/screen";
import { fetchMessages, sendMessage } from "@/features/chat/api";
import { markNotificationsAsReadByType } from "@/features/notifications/api";

export default function ChatScreen() {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const messages = useQuery({ queryKey: ["messages"], queryFn: () => fetchMessages() });

  useFocusEffect(
    useCallback(() => {
      markNotificationsAsReadByType("CHAT_MESSAGE");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }, [])
  );
  const mutation = useMutation({
    mutationFn: () => sendMessage(body),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  return (
    <Screen>
      <Heading title="Internal Chat" subtitle="Realtime team communication" />
      <View className="gap-4">
        {(messages.data ?? []).map((message: any) => (
          <AppCard key={message.id}>
            <Text className="text-sm font-medium text-slate-900">{message.body}</Text>
            <Text className="mt-2 text-xs text-slate-500">{new Date(message.created_at).toLocaleString()}</Text>
          </AppCard>
        ))}
        <AppCard>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Send a quick update"
            className="rounded-2xl border border-slate-200 px-4 py-4"
          />
          <Pressable className="mt-3 rounded-2xl bg-blue-600 px-4 py-4" onPress={() => mutation.mutate()}>
            <Text className="text-center font-semibold text-white">Send Message</Text>
          </Pressable>
        </AppCard>
      </View>
    </Screen>
  );
}
