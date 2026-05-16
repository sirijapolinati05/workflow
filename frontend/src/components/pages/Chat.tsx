import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMessages } from "@/features/chat/api";
import { markNotificationsAsReadByType } from "@/features/dashboard/api";

import { CollectionPage } from "./CollectionPage";

export function ChatPage() {
  const messages = useQuery<{ items: any[] }>({ queryKey: ["messages"], queryFn: () => fetchMessages() });

  useEffect(() => {
    markNotificationsAsReadByType("CHAT_MESSAGE").catch(console.error);
  }, []);

  return (
    <CollectionPage
      title="Internal Chat"
      subtitle="Realtime team messaging with threaded workspace communication"
      items={(messages.data?.items ?? []) as any[]}
      render={(message: any) => (
        <div key={message.id} className="rounded-2xl bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">{message.body}</p>
          <p className="text-sm text-slate-500">{new Date(message.created_at).toLocaleString()}</p>
        </div>
      )}
    />
  );
}
