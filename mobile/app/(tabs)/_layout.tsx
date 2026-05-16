import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "@/features/notifications/api";

export default function TabsLayout() {
  const notifications = useQuery({ 
    queryKey: ["notifications"], 
    queryFn: fetchNotifications,
    refetchInterval: 10000 
  });

  const getUnreadCount = (label: string) => {
    const allNotifications = (notifications.data ?? []) as any[];
    const unread = allNotifications.filter(n => !n.is_read);
    
    if (label === "Tasks") {
      return unread.filter(n => n.type === "TASK_ASSIGNED" || n.type === "TASK_UPDATED").length;
    }
    if (label === "Groups") {
      return unread.filter(n => n.type === "GROUP_INVITE" || n.type === "GROUP_MESSAGE").length;
    }
    if (label === "Chat") {
      return unread.filter(n => n.type === "CHAT_MESSAGE").length;
    }
    if (label === "People") {
      return unread.filter(n => n.type === "NEW_USER").length;
    }
    if (label === "Alerts") {
      return unread.length;
    }
    return 0;
  };

  const renderBadge = (count: number) => {
    return count > 0 ? (count > 9 ? "9+" : count) : undefined;
  };

  return (
    <Tabs screenOptions={{ 
      headerShown: false, 
      tabBarActiveTintColor: "#2563eb",
      tabBarInactiveTintColor: "#64748b",
      tabBarStyle: {
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: "white",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8
      }
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="tasks" 
        options={{ 
          title: "Tasks",
          tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" size={size} color={color} />,
          tabBarBadge: renderBadge(getUnreadCount("Tasks"))
        }} 
      />
      <Tabs.Screen 
        name="chat" 
        options={{ 
          title: "Chat",
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />,
          tabBarBadge: renderBadge(getUnreadCount("Chat"))
        }} 
      />
      <Tabs.Screen 
        name="notifications" 
        options={{ 
          title: "Alerts",
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
          tabBarBadge: renderBadge(getUnreadCount("Alerts"))
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />
        }} 
      />
    </Tabs>
  );
}

