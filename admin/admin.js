(function () {
  "use strict";

  var state = {
    query: "",
    status: "all",
    sort: "newest",
    page: 1,
    pageSize: 25,
    pageCount: 1,
    selectedIds: new Set(),
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
    selectionToolbar: document.getElementById("selection-toolbar"),
    selectedCount: document.getElementById("selected-count"),
    deleteSelected: document.getElementById("delete-selected"),
    selectAll: document.getElementById("select-all"),
    deleteDialog: document.getElementById("delete-dialog"),
    deleteDialogMessage: document.getElementById("delete-dialog-message"),
    cancelDelete: document.getElementById("cancel-delete"),
    confirmDelete: document.getElementById("confirm-delete"),
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

  function formatPhone(value) {
    var source = String(value || "").trim();
    var digits = source.replace(/\D/g, "");

    if (digits.length === 10) {
      return digits.slice(0, 3) + "-" + digits.slice(3, 6) + "-" + digits.slice(6);
    }

    if (digits.length === 11 && digits.charAt(0) === "1") {
      return "1-" + digits.slice(1, 4) + "-" + digits.slice(4, 7) + "-" + digits.slice(7);
    }

    if (digits.length === 7) {
      return digits.slice(0, 3) + "-" + digits.slice(3);
    }

    return source;
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

  function updateSelection() {
    var checkboxes = Array.from(elements.rows.querySelectorAll(".row-checkbox"));
    var selectedCount = state.selectedIds.size;
    var allSelected = checkboxes.length > 0 && checkboxes.every(function (checkbox) { return checkbox.checked; });

    elements.selectionToolbar.hidden = selectedCount === 0;
    elements.selectedCount.textContent = selectedCount + " selected";
    elements.deleteSelected.textContent = "Delete selected (" + selectedCount + ")";
    elements.selectAll.checked = allSelected;
    elements.selectAll.indeterminate = !allSelected && checkboxes.some(function (checkbox) { return checkbox.checked; });
  }

  function renderRows(signups) {
    state.selectedIds.clear();
    elements.rows.replaceChildren();

    signups.forEach(function (signup) {
      var row = document.createElement("tr");
      var signupId = Number(signup.id);

      var selection = createCell("Select", "selection-cell");
      var selectionLabel = createElement("label", "checkbox-label");
      var checkbox = createElement("input", "row-checkbox");
      checkbox.type = "checkbox";
      checkbox.value = String(signup.id);
      checkbox.setAttribute("aria-label", "Select " + signup.first_name + " " + signup.last_name);
      checkbox.addEventListener("change", function () {
        if (checkbox.checked) state.selectedIds.add(signupId);
        else state.selectedIds.delete(signupId);
        row.classList.toggle("is-selected", checkbox.checked);
        updateSelection();
      });
      selectionLabel.appendChild(checkbox);
      selection.appendChild(selectionLabel);
      row.appendChild(selection);

      var name = createCell("Name", "name-cell");
      name.appendChild(createElement("strong", "", (signup.first_name + " " + signup.last_name).trim() || "Unnamed"));
      name.appendChild(createElement("span", "", "ID " + signup.id));
      row.appendChild(name);

      var contact = createCell("Contact", "contact-cell");
      var email = createElement("a", "", signup.email || "No email");
      if (signup.email) email.href = "mailto:" + signup.email;
      contact.appendChild(email);
      if (signup.phone) {
        var phone = createElement("a", "", formatPhone(signup.phone));
        phone.href = "tel:" + String(signup.phone).replace(/[^+\d]/g, "");
        contact.appendChild(phone);
      } else {
        contact.appendChild(createElement("span", "", "No phone"));
      }
      row.appendChild(contact);

      var interest = createCell("Interest", "interest-cell");
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

      var status = createCell("Status", "status-cell");
      status.appendChild(createStatusSelect(signup));
      row.appendChild(status);

      elements.rows.appendChild(row);
    });

    updateSelection();
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

  function openDeleteDialog() {
    var count = state.selectedIds.size;
    if (!count) return;

    elements.deleteDialogMessage.textContent = "You’re about to permanently delete " + count +
      (count === 1 ? " signup" : " signups") + " from the database. This action cannot be undone.";
    elements.confirmDelete.textContent = count === 1 ? "Delete signup" : "Delete " + count + " signups";
    elements.deleteDialog.showModal();
  }

  async function confirmDelete() {
    var ids = Array.from(state.selectedIds);
    if (!ids.length) {
      elements.deleteDialog.close();
      return;
    }

    elements.confirmDelete.disabled = true;
    elements.cancelDelete.disabled = true;
    elements.confirmDelete.textContent = "Deleting…";

    try {
      var response = await fetch("/api/admin/presignups", {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "epsilon-admin"
        },
        body: JSON.stringify({ ids: ids })
      });
      var body = await response.json().catch(function () { return {}; });

      if (!response.ok || !body.success) {
        throw new Error(body.error || "The selected signups could not be deleted.");
      }

      elements.deleteDialog.close();
      state.selectedIds.clear();
      showToast(body.deleted + (body.deleted === 1 ? " signup deleted." : " signups deleted."));
      await loadSignups();
    } catch (error) {
      showToast(error.message || "The selected signups could not be deleted.", true);
    } finally {
      elements.confirmDelete.disabled = false;
      elements.cancelDelete.disabled = false;
      elements.confirmDelete.textContent = "Delete signups";
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

  elements.selectAll.addEventListener("change", function () {
    elements.rows.querySelectorAll(".row-checkbox").forEach(function (checkbox) {
      checkbox.checked = elements.selectAll.checked;
      var id = Number(checkbox.value);
      if (checkbox.checked) state.selectedIds.add(id);
      else state.selectedIds.delete(id);
      checkbox.closest("tr").classList.toggle("is-selected", checkbox.checked);
    });
    updateSelection();
  });

  elements.deleteSelected.addEventListener("click", openDeleteDialog);
  elements.cancelDelete.addEventListener("click", function () { elements.deleteDialog.close(); });
  elements.confirmDelete.addEventListener("click", confirmDelete);

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
