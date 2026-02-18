(function () {
  "use strict";

  var CALENDAR_ID =
    "7b636f4d351c6be0c51630997225e6f234c65a2d310bac25caad99313a24ef4a@group.calendar.google.com";
  var API_KEY = "AIzaSyBNlYH01_9Hc5S1J9vuFmu2nUqBZJNAXxs";
  var TIMEZONE = "America/Chicago";

  var container = document.getElementById("calendar");
  if (!container) return;

  var viewDate = new Date();
  var events = new Map();
  var selectedDate = null;

  // --- API ---

  function monthRange(year, month) {
    var start = new Date(year, month, 1);
    var end = new Date(year, month + 1, 1);
    return {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
    };
  }

  function fetchMonthEvents(year, month) {
    var range = monthRange(year, month);
    var url = new URL(
      "https://www.googleapis.com/calendar/v3/calendars/" +
        encodeURIComponent(CALENDAR_ID) +
        "/events"
    );
    url.searchParams.set("key", API_KEY);
    url.searchParams.set("timeMin", range.timeMin);
    url.searchParams.set("timeMax", range.timeMax);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "100");
    url.searchParams.set("timeZone", TIMEZONE);

    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (data) {
        return data.items || [];
      });
  }

  // --- Helpers ---

  function dateKey(d) {
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function indexEvents(items) {
    var map = new Map();
    items.forEach(function (event) {
      var raw = event.start.dateTime || event.start.date;
      var key = raw.substring(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    });
    return map;
  }

  function formatDate(event) {
    var start = new Date(event.start.dateTime || event.start.date);
    return start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function formatTime(event) {
    if (!event.start.dateTime) return "All day";
    var start = new Date(event.start.dateTime);
    return start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // --- Rendering ---

  function render() {
    var year = viewDate.getFullYear();
    var month = viewDate.getMonth();

    container.innerHTML = "";
    container.appendChild(renderNav(year, month));
    container.appendChild(renderGrid(year, month));
    container.appendChild(renderEventList());
  }

  function renderNav(year, month) {
    var nav = document.createElement("div");
    nav.className = "calendar-nav";

    var prev = document.createElement("button");
    prev.textContent = "\u25C0";
    prev.setAttribute("aria-label", "Previous month");
    prev.addEventListener("click", function () {
      navigate(-1);
    });

    var title = document.createElement("strong");
    title.textContent = new Date(year, month).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    var next = document.createElement("button");
    next.textContent = "\u25B6";
    next.setAttribute("aria-label", "Next month");
    next.addEventListener("click", function () {
      navigate(1);
    });

    nav.appendChild(prev);
    nav.appendChild(title);
    nav.appendChild(next);
    return nav;
  }

  function renderGrid(year, month) {
    var table = document.createElement("table");
    table.className = "calendar-grid";

    // Header row
    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach(function (d) {
      var th = document.createElement("th");
      th.textContent = d;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    // Day cells
    var tbody = document.createElement("tbody");
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var today = new Date();
    var todayKey = dateKey(today);

    var row = document.createElement("tr");

    for (var i = 0; i < firstDay; i++) {
      row.appendChild(document.createElement("td"));
    }

    for (var day = 1; day <= daysInMonth; day++) {
      if ((firstDay + day - 1) % 7 === 0 && day > 1) {
        tbody.appendChild(row);
        row = document.createElement("tr");
      }

      var td = document.createElement("td");
      td.textContent = day;

      var key =
        year +
        "-" +
        String(month + 1).padStart(2, "0") +
        "-" +
        String(day).padStart(2, "0");

      if (events.has(key)) td.classList.add("has-event");
      if (key === todayKey) td.classList.add("today");
      if (key === selectedDate) td.classList.add("selected");

      (function (k) {
        td.addEventListener("click", function () {
          selectDate(k);
        });
      })(key);

      row.appendChild(td);
    }

    // Pad last row
    while (row.children.length < 7) {
      row.appendChild(document.createElement("td"));
    }
    tbody.appendChild(row);

    table.appendChild(tbody);
    return table;
  }

  function renderEventList() {
    var div = document.createElement("div");
    div.className = "calendar-events";

    var items;
    if (selectedDate) {
      items = events.get(selectedDate) || [];
    } else {
      // Flatten all events for the month, sorted by date
      items = [];
      events.forEach(function (dayEvents) {
        items = items.concat(dayEvents);
      });
    }

    if (items.length === 0) {
      var p = document.createElement("p");
      p.textContent = selectedDate
        ? "No events on this day."
        : "No events this month.";
      div.appendChild(p);
      return div;
    }

    var table = document.createElement("table");
    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    ["Date", "Time", "Event", "Location"].forEach(function (h) {
      var th = document.createElement("th");
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    items.forEach(function (event) {
      var tr = document.createElement("tr");

      var dateTd = document.createElement("td");
      dateTd.textContent = formatDate(event);
      tr.appendChild(dateTd);

      var timeTd = document.createElement("td");
      timeTd.textContent = formatTime(event);
      tr.appendChild(timeTd);

      var eventTd = document.createElement("td");
      eventTd.textContent = event.summary || "Untitled";
      tr.appendChild(eventTd);

      var locTd = document.createElement("td");
      locTd.textContent = event.location || "\u2014";
      tr.appendChild(locTd);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    div.appendChild(table);
    return div;
  }

  // --- Navigation ---

  function navigate(delta) {
    viewDate.setMonth(viewDate.getMonth() + delta);
    selectedDate = null;
    loadAndRender();
  }

  function selectDate(key) {
    selectedDate = selectedDate === key ? null : key;
    render();
  }

  // --- Init ---

  function loadAndRender() {
    var year = viewDate.getFullYear();
    var month = viewDate.getMonth();

    // Render grid immediately so there's no flash
    events = new Map();
    render();

    fetchMonthEvents(year, month)
      .then(function (items) {
        events = indexEvents(items);
        render();
      })
      .catch(function () {
        // Grid is already visible, just leave it as-is
      });
  }

  loadAndRender();
})();
