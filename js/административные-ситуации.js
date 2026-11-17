/* Private scenarios. Supabase RLS is the authority for access. */
(() => {
  "use strict";
  const root = document.getElementById("page-situations");
  const nav = document.getElementById("mainNav");
  if (!root || !nav || !window.supabase?.createClient) return;
  const db = window.supabase.createClient(
    "https://lejagyuibxdnvpmxoggy.supabase.co",
    "sb_publishable_8cdFcw4V8F545924bpdLjg_3yKTHt1d",
    { auth: { storageKey: "kutuzovsky-department-auth", autoRefreshToken: true, persistSession: true } }
  );
  let generation = 0;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.page = "situations";
  button.textContent = "Ситуации";
  button.hidden = true;
  button.style.display = "none";
  button.addEventListener("click", () => {
    if (window.kutSituationsAuthorized && typeof window.showPage === "function") window.showPage("situations");
  });
  nav.append(button);
  // Scenario shortcuts in the public homepage must not expose the restricted section.
  const shortcuts = [...document.querySelectorAll("[data-jump-situation], [data-local-scenario]")];
  const hide = () => {
    window.kutSituationsAuthorized = false;
    button.hidden = true;
    button.style.display = "none";
    shortcuts.forEach(el => { el.hidden = true; el.style.display = "none"; });
    root.replaceChildren();
    if (location.hash === "#situations" && typeof window.showPage === "function") window.showPage("home");
  };
  const esc = text => String(text ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[ch]);
  const prepare = () => {
    const host = root.querySelector("#localScenarios");
    if (!host) return;
    const input = host.querySelector("#localScenarioSearch");
    const counter = host.querySelector("#localScenarioCount");
    let filter = "all";
    const apply = () => {
      let visible = 0;
      const cards = [...host.querySelectorAll(".local-scenario")];
      const needle = (input?.value || "").toLocaleLowerCase("ru").trim();
      cards.forEach(card => {
        const group = (card.dataset.group || "").split(/\s+/);
        const hay = (card.textContent + " " + (card.dataset.search || "")).toLocaleLowerCase("ru");
        const show = (filter === "all" || group.includes(filter)) && (!needle || hay.includes(needle));
        card.hidden = !show;
        if (show) visible++;
      });
      if (counter) counter.textContent = visible + " из " + cards.length;
    };
    input?.addEventListener("input", apply);
    host.querySelectorAll("[data-local-filter]").forEach(btn => btn.addEventListener("click", () => {
      filter = btn.dataset.localFilter;
      host.querySelectorAll("[data-local-filter]").forEach(other => other.classList.toggle("active", btn === other));
      apply();
    }));
    host.querySelectorAll(".scenario-head").forEach(head => head.addEventListener("click", () => {
      const open = head.closest(".scenario-card")?.classList.toggle("open");
      head.setAttribute("aria-expanded", String(!!open));
    }));
    apply();
  };
  async function check() {
    const request = ++generation;
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (request !== generation) return;
    if (authError || !user) { hide(); return; }
    const { data: access, error: accessError } = await db.from("kut_staff_access").select("role").eq("user_id", user.id).maybeSingle();
    if (request !== generation) return;
    if (accessError || access?.role !== "admin") { hide(); return; }
    const { data, error } = await db.from("kut_admin_situations").select("html").eq("id", "main").single();
    if (request !== generation) return;
    if (error || !data?.html) { hide(); return; }
    root.innerHTML = data.html.replace(/^<section[^>]*id="page-situations"[^>]*>/, "").replace(/<\/section>\s*$/, "");
    prepare();
    window.kutSituationsAuthorized = true;
    button.hidden = false;
    button.style.display = "";
    shortcuts.forEach(el => { el.hidden = false; el.style.display = ""; });
  }
  // Never allow hash navigation to reveal the section before verification.
  hide();
  db.auth.onAuthStateChange(() => setTimeout(check, 0));
  window.addEventListener("focus", check);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
  document.addEventListener("click", event => {
    const target = event.target.closest("[data-jump-situation], [data-local-scenario]");
    if (!target || !window.kutSituationsAuthorized) return;
    const id = target.dataset.localScenario || "scenario-" + target.dataset.jumpSituation;
    const card = document.getElementById(id);
    if (card) {
      card.classList.add("open");
      card.querySelector(".scenario-head")?.setAttribute("aria-expanded", "true");
    }
  });
  check();
})();
