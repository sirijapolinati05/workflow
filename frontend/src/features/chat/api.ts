import { api } from "@/lib/api";

export async function fetchMessages(groupId?: string, recipientId?: string) {
  let url = "/chat/messages?page=1&page_size=100";
  if (groupId) url += `&group_id=${groupId}`;
  if (recipientId) url += `&recipient_id=${recipientId}`;
  const { data } = await api.get(url);
  return data;
}

export async function sendMessage(payload: { 
  body?: string; 
  group_id?: string; 
  recipient_id?: string; 
  type?: string; 
  metadata?: any;
}) {
  const { data } = await api.post("/chat/messages", payload);
  return data;
}

export async function votePoll(messageId: string, optionIndex: number) {
  const { data } = await api.post(`/chat/messages/${messageId}/vote?option_index=${optionIndex}`);
  return data;
}
export async function deleteMessage(messageId: string) {
  const { data } = await api.delete(`/chat/messages/${messageId}`);
  return data;
}
export async function reactToMessage(messageId: string, emoji: string) {
  const { data } = await api.post(`/chat/messages/${messageId}/react?emoji=${encodeURIComponent(emoji)}`);
  return data;
}
