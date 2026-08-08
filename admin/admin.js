(function () {
  "use strict";

  var state = {
    query: "",
    status: "all",
    sort: "newest",
    page: 1,
    pageSize: 25,
    pageCount: 1,
    controller: null,
    toastTimer: null
  };

  var elements = {
    adminEmail: document.getElementById("admin-email"),
    total: document.getElementById("total-count"),
    newCount: document.getElementById("new-count"),
    contacted: document.getElementById("contacted-count"),
    scheduled: document.getElementById("scheduled-count"),
    resultCount: document.getElementById("result-count"),
    rows: document.getElementById("signup-rows"),
    table: document.getElementById("signup-table"),
    tableWrap: document.getElementById("table-wrap"),
    empty: document.getElementById("empty-state"),
    error: document.getElementById("error-notice"),
    errorMessage: document.getElementById("error-message"),
    filters: document.getElementById("filters"),
    search: document.getElementById("search-input"),
    status: document.getElementById("status-filter"),
    sort: document.getElementById("sort-filter"),
    refresh: document.getElementById("refresh-button"),
    retry: document.getElementById("retry-button"),
    clear: document.getElementById("clear-filters"),
    previous: document.getElementById("previous-page"),
    next: document.getElementById("next-page"),
    pageSummary: document.getElementById("page-summary"),
    toast: document.getElementById("toast")
  };

  function titleCase(value) {
    return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
  }

  function formatDate(value) {
    if (!value) return { date: "Not recorded", time: "" };
    var source = String(value).trim();
    var normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(source)
      ? source.replace(" ", "T") + "Z"
      : source;
    var date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return { date: source, time: "" };

    return {
      date: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date),
      time: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date)
    };
  }

  function createElement(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function createCell(label, className) {
    var cell = createElement("td", className);
    cell.setAttribute("data-label", label);
    return cell;
  }

  function createStatusSelect(signup) {
    var select = createElement("select", "status-select");
    select.setAttribute("aria-label", "Update status for " + signup.first_name + " " + signup.last_name);
    select.dataset.status = signup.status;

    ["new", "contacted", "scheduled", "closed"].forEach(function (status) {
      var option = createElement("option", "", titleCase(status));
      option.value = status;
      option.selected = status === signup.status;
      select.appendChild(option);
    });

    select.addEventListener("change", function () {
      updateStatus(signup.id, select, signup.status);
    });

    return select;
  }

  function renderRows(signups) {
    elements.rows.replaceChildren();

    signups.forEach(function (signup) {
      var row = document.createElement("tr");

      var name = createCell("Name", "name-cell");
      name.appendChild(createElement("strong", "", (signup.first_name + " " + signup.last_name).trim() || "Unnamed"));
      name.appendChild(createElement("span", "", "ID " + signup.id));
      row.appendChild(name);

      var contact = createCell("Contact", "contact-cell");
      var email = createElement("a", "", signup.email || "No email");
      if (signup.email) email.href = "mailto:" + signup.email;
      contact.appendChild(email);
      if (signup.phone) {
        var phone = createElement("a", "", signup.phone);
        phone.href = "tel:" + signup.phone.replace(/[^+\d]/g, "");
        contact.appendChild(phone);
      } else {
        contact.appendChild(createElement("span", "", "No phone"));
      }
      row.appendChild(contact);

      var interest = createCell("Interest", "");
      interest.appendChild(createElement("span", "interest", signup.interested_in || "Not specified"));
      row.appendChild(interest);

      var message = createCell("Message", "message");
      if (signup.how_can_we_help) {
        var details = document.createElement("details");
        var summary = createElement("summary", "", signup.how_can_we_help);
        var fullMessage = createElement("p", "full-message", signup.how_can_we_help);
        details.appendChild(summary);
        details.appendChild(fullMessage);
        message.appendChild(details);
      } else {
        message.appendChild(createElement("span", "no-message", "No message"));
      }
      row.appendChild(message);

      var submitted = createCell("Submitted", "submitted-cell");
      var formatted = formatDate(signup.submitted_at);
      submitted.appendChild(document.createTextNode(formatted.date));
      if (formatted.time) submitted.appendChild(createElement("span", "", formatted.time));
      row.appendChild(submitted);

      var status = createCell("Status", "");
      status.appendChild(createStatusSelect(signup));
      row.appendChild(status);

      elements.rows.appendChild(row);
    });
  }

  function showToast(message, isError) {
    window.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.toggle("is-error", Boolean(isError));
    elements.toast.hidden = false;
    state.toastTimer = window.setTimeout(function () {
      elements.toast.hidden = true;
    }, 3500);
  }

  function setLoading(isLoading) {
    elements.tableWrap.setAttribute("aria-busy", String(isLoading));
    elements.refresh.disabled = isLoading;
    elements.refresh.classList.toggle("is-loading", isLoading);
  }

  function updateSummary(meta) {
    elements.total.textContent = meta.total.toLocaleString();
    elements.newCount.textContent = meta.status_counts.new.toLocaleString();
    elements.contacted.textContent = meta.status_counts.contacted.toLocaleString();
    elements.scheduled.textContent = meta.status_counts.scheduled.toLocaleString();
    elements.resultCount.textContent = meta.filtered === meta.total
      ? meta.total.toLocaleString() + (meta.total === 1 ? " signup" : " signups")
      : meta.filtered.toLocaleString() + " of " + meta.total.toLocaleString() + " signups";
    elements.pageSummary.textContent = "Page " + meta.page + " of " + meta.page_count;
    elements.previous.disabled = meta.page <= 1;
    elements.next.disabled = meta.page >= meta.page_count;
    state.page = meta.page;
    state.pageCount = meta.page_count;
  }

  async function loadSignups(options) {
    options = options || {};
    if (state.controller) state.controller.abort();
    var controller = new AbortController();
    state.controller = controller;
    setLoading(true);
    elements.error.hidden = true;

    var params = new URLSearchParams({
      q: state.query,
      status: state.status,
      sort: state.sort,
      page: String(state.page),
      page_size: String(state.pageSize)
    });

    try {
      var response = await fetch("/api/admin/presignups?" + params.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      var body = await response.json().catch(function () { return {}; });

      if (!response.ok || !body.success) {
        throw new Error(body.error || "The request could not be completed.");
      }

      renderRows(body.presignups);
      updateSummary(body.meta);
      elements.adminEmail.textContent = body.admin && body.admin.email ? body.admin.email : "Authorized administrator";
      elements.table.hidden = body.presignups.length === 0;
      elements.empty.hidden = body.presignups.length !== 0;
      if (options.announce) showToast("Signup list refreshed.");
    } catch (error) {
      if (error.name === "AbortError") return;
      elements.errorMessage.textContent = error.message || "Please try again.";
      elements.error.hidden = false;
    } finally {
      if (state.controller === controller) setLoading(false);
    }
  }

  async function updateStatus(id, select, previousStatus) {
    var nextStatus = select.value;
    select.disabled = true;

    try {
      var response = await fetch("/api/admin/presignups/" + encodeURIComponent(id), {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "epsilon-admin"
        },
        body: JSON.stringify({ status: nextStatus })
      });
      var body = await response.json().catch(function () { return {}; });

      if (!response.ok || !body.success) {
        throw new Error(body.error || "The status could not be updated.");
      }

      select.dataset.status = nextStatus;
      showToast("Status updated to " + titleCase(nextStatus) + ".");
      await loadSignups();
      select.disabled = false;
    } catch (error) {
      select.value = previousStatus;
      select.dataset.status = previousStatus;
      select.disabled = false;
      showToast(error.message || "The status could not be updated.", true);
    }
  }

  var searchTimer;
  elements.filters.addEventListener("submit", function (event) {
    event.preventDefault();
    window.clearTimeout(searchTimer);
    state.query = elements.search.value.trim();
    state.page = 1;
    loadSignups();
  });

  elements.search.addEventListener("input", function () {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(function () {
      state.query = elements.search.value.trim();
      state.page = 1;
      loadSignups();
    }, 250);
  });

  elements.status.addEventListener("change", function () {
    state.status = elements.status.value;
    state.page = 1;
    loadSignups();
  });

  elements.sort.addEventListener("change", function () {
    state.sort = elements.sort.value;
    state.page = 1;
    loadSignups();
  });

  elements.refresh.addEventListener("click", function () { loadSignups({ announce: true }); });
  elements.retry.addEventListener("click", function () { loadSignups(); });
  elements.clear.addEventListener("click", function () {
    elements.search.value = "";
    elements.status.value = "all";
    state.query = "";
    state.status = "all";
    state.page = 1;
    loadSignups();
  });
  elements.previous.addEventListener("click", function () {
    if (state.page > 1) {
      state.page -= 1;
      loadSignups();
    }
  });
  elements.next.addEventListener("click", function () {
    if (state.page < state.pageCount) {
      state.page += 1;
      loadSignups();
    }
  });

  loadSignups();
})();
