import { useState, useEffect } from "react";
import CampaignRounded from "@mui/icons-material/CampaignRounded";
import { listPublishedAnnouncements } from "../announcementRepository";

export function StudentAnnouncements() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    listPublishedAnnouncements().then(setItems).catch(() => setItems([]));
  }, []);
  if (!items.length) return null;
  return <section className="student-announcements" aria-label="课程公告"><div className="student-announcements-heading"><span><CampaignRounded fontSize="small" />课程公告</span><small>{items.length} 条</small></div>{items.slice(0, 3).map((item) => <article key={item.id}><strong>{item.title}</strong><p>{item.content}</p><small>{new Date(item.updatedAt).toLocaleDateString("zh-CN")}</small></article>)}</section>;
}
