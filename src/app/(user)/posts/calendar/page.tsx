"use client";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";

export default function CalendarUI() {
  const events = [
    { title: "TikTok Post", date: "2025-08-05T06:30:00", color: "green" },
    { title: "Instagram Post", date: "2025-08-03T20:00:00", color: "pink" },
    { title: "LinkedIn Post", date: "2025-08-01T19:00:00", color: "blue" }
  ];

  return (
    <div className="bg-white p-8">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin]}
        initialView="dayGridMonth"
        events={events}
        eventContent={renderEventContent}
      />
    </div>
  );
}

function renderEventContent(eventInfo: any) {
  return (
    <div className="flex items-center gap-2">
      {/* Example: Add a social icon */}
      <span>📱</span>
      <b>{eventInfo.timeText}</b>
      <i>{eventInfo.event.title}</i>
    </div>
  );
}
