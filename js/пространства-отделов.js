/* Отдельные пространства подразделений. Все записи и доступ проверяет Supabase RLS. */
(() => {
  "use strict";
  const root = document.getElementById("page-departments");
  const lib = window.supabase;
  if (!root || !lib?.createClient) return;
  const db = lib.createClient(
    "https://lejagyuibxdnvpmxoggy.supabase.co",
    "sb_publishable_8cdFcw4V8F545924bpdLjg_3yKTHt1d",
    { auth: { storageKey: "kutuzovsky-department-auth", autoRefreshToken: true, persistSession: true } }
  );
  const names = {
    "УК": "Управление кадров",
    "УЛО": "Управление личной охраны",
    "УСН": "Управление специального назначения",
    "УВК": "Управление внутреннего контроля"
  };
  const panelNames = { about: "О подразделении", uniforms: "Форма", members: "Состав", sections: "Материалы", law: "По Уставу" };
  const views = new Map();
  const content = new Map();
  let user = null, access = null, requests = [], staff = [], editor = null, activeAuth = "login";

  const esc = x => String(x ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const canEdit = code => !!(user && access && (access.role === "admin" || (access.role === "editor" && access.department_code === code)));
  const isAdmin = () => !!(user && access?.role === "admin");
  const empty = text => '<div class="kut-muted">' + esc(text) + '</div>';
  const button = (action, label, extra = "") =>
    '<button type="button" class="kut-small-btn" data-kut-action="' + action + '" ' + extra + '>' + esc(label) + '</button>';
  const errorText = err => err?.message || "Не удалось выполнить операцию.";
  const editTools = (code, kind, id) => !canEdit(code) ? "" :
    '<div class="kut-inline-actions">' +
    button("edit", "Изменить", 'data-kut-kind="' + kind + '" data-kut-id="' + esc(id) + '" data-kut-code="' + esc(code) + '"') +
    button("delete", "Удалить", 'data-kut-kind="' + kind + '" data-kut-id="' + esc(id) + '" data-kut-code="' + esc(code) + '"') +
    '</div>';

  const accountModal = document.createElement("div");
  accountModal.className = "kut-modal";
  accountModal.id = "kutAccountModal";
  accountModal.hidden = true;
  accountModal.innerHTML = '<div class="kut-dialog" role="dialog" aria-modal="true" aria-labelledby="kutAccountTitle">' +
    '<div class="kut-dialog-title"><h3 id="kutAccountTitle">Личный кабинет</h3><button type="button" class="kut-close" data-kut-close>×</button></div>' +
    '<div id="kutAccountBody"></div><div class="kut-auth-status" id="kutAccountStatus" role="status"></div></div>';
  document.body.append(accountModal);

  const editModal = document.createElement("div");
  editModal.className = "kut-modal";
  editModal.hidden = true;
  editModal.innerHTML = '<div class="kut-dialog" role="dialog" aria-modal="true" aria-labelledby="kutEditorTitle">' +
    '<div class="kut-dialog-title"><h3 id="kutEditorTitle"></h3><button type="button" class="kut-close" data-kut-close>×</button></div>' +
    '<form id="kutEditorForm"></form><div id="kutEditorStatus" class="kut-auth-status" role="status"></div></div>';
  document.body.append(editModal);

  const status = (message, bad = false) => {
    const box = document.getElementById("kutAccountStatus");
    box.textContent = message || "";
    box.classList.toggle("kut-error", !!bad);
  };
  const editorStatus = (message, bad = false) => {
    const box = document.getElementById("kutEditorStatus");
    box.textContent = message || "";
    box.classList.toggle("kut-error", !!bad);
  };

  function mount() {
    root.querySelectorAll(".dept-card").forEach(card => {
      const code = card.querySelector(".dept-code")?.textContent.trim();
      if (!names[code] || views.has(code)) return;
      const body = card.querySelector(".dept-code")?.nextElementSibling;
      const legalText = body?.querySelector(".exact-text");
      const legalRefs = body?.querySelector(".refs");
      if (!body || !legalText || !legalRefs) return;
      const box = document.createElement("div");
      box.className = "kut-workspace";
      box.dataset.kutCode = code;
      box.innerHTML =
        '<div class="kut-workspace-top"><div><div class="kut-overline">ПРОСТРАНСТВО ПОДРАЗДЕЛЕНИЯ</div><h4>' + esc(names[code]) + '</h4></div>' +
        '<button type="button" class="kut-btn kut-btn-primary" data-kut-action="account">Личный кабинет</button></div>' +
        '<div class="kut-tabs" role="tablist">' +
        Object.entries(panelNames).map(([id, title], i) =>
          '<button type="button" class="kut-tab" data-kut-tab="' + id + '" role="tab" aria-selected="' + (i === 0) + '">' + esc(title) + '</button>'
        ).join("") +
        '</div>' +
        Object.keys(panelNames).map((id, i) => '<div class="kut-pane" data-kut-pane="' + id + '"' + (i ? ' hidden' : '') + '></div>').join("");
      box.querySelector('[data-kut-pane="law"]').append(legalText, legalRefs);
      body.append(box);
      views.set(code, box);
      content.set(code, { department: null, uniforms: [], members: [], sections: [] });
      render(code);
    });
  }

  function render(code) {
    const box = views.get(code);
    if (!box) return;
    const data = content.get(code);
    const edit = canEdit(code);
    const department = data.department;
    const about = box.querySelector('[data-kut-pane="about"]');
    about.innerHTML =
      '<div class="kut-row-head"><h5>О подразделении</h5>' +
      (edit ? button("edit", "Редактировать описание", 'data-kut-kind="about" data-kut-code="' + code + '"') : "") + '</div>' +
      (department?.introduction?.trim() ? '<p>' + esc(department.introduction) + '</p>' : empty("Описание ещё не опубликовано."));

    const uniformBox = box.querySelector('[data-kut-pane="uniforms"]');
    uniformBox.innerHTML =
      '<div class="kut-row-head"><h5>Установленная форма</h5>' +
      (edit ? button("edit", "Добавить комплект", 'data-kut-kind="uniforms" data-kut-code="' + code + '"') : "") + '</div>' +
      (data.uniforms.length ? '<div class="kut-uniform-grid">' + data.uniforms.map(item => {
        const img = item.image_path ? db.storage.from("kut-uniforms").getPublicUrl(item.image_path).data.publicUrl : "";
        return '<article class="kut-uniform"><div class="kut-uniform-img">' +
          (img ? '<img loading="lazy" alt="' + esc(item.title) + '" src="' + esc(img) + '">' : 'Фотография не добавлена') +
          '</div><div class="kut-uniform-body"><b>' + esc(item.title) + '</b><p>' + esc(item.description) + '</p>' +
          editTools(code, "uniforms", item.id) + '</div></article>';
      }).join("") + '</div>' : empty("Комплекты формы ещё не добавлены."));

    const memberBox = box.querySelector('[data-kut-pane="members"]');
    memberBox.innerHTML = '<div class="kut-row-head"><h5>Личный состав</h5>' +
      (edit ? button("edit", "Добавить сотрудника", 'data-kut-kind="members" data-kut-code="' + code + '"') : "") + '</div>' +
      (data.members.length ? '<div class="kut-staff-list">' + data.members.map(item =>
        '<div class="kut-staff"><b>' + esc(item.full_name) + '</b><span>' + esc(item.rank || "Звание не указано") +
        '</span><small>' + esc(item.position || "Должность не указана") + '</small>' +
        (edit ? '<span>' + editTools(code, "members", item.id) + '</span>' : "") + '</div>'
      ).join("") + '</div>' : empty("Состав подразделения пока не опубликован."));

    const sectionBox = box.querySelector('[data-kut-pane="sections"]');
    sectionBox.innerHTML = '<div class="kut-row-head"><h5>Материалы подразделения</h5>' +
      (edit ? button("edit", "Добавить материал", 'data-kut-kind="sections" data-kut-code="' + code + '"') : "") + '</div>' +
      (data.sections.length ? data.sections.map(item =>
        '<article class="kut-custom-section"><h5>' + esc(item.title) + '</h5><p>' +
        esc(item.content) + '</p>' + editTools(code, "sections", item.id) + '</article>'
      ).join("") : empty("Здесь появятся собственные инструкции, условия повышения, объявления и другие материалы отдела."));

    box.querySelector('[data-kut-action="account"]').textContent = user
      ? (isAdmin() ? "Кабинет руководства" : (access ? "Мой кабинет" : "Запросить доступ"))
      : "Личный кабинет";
  }

  async function load(code) {
    const results = await Promise.all([
      db.from("kut_departments").select("*").eq("code", code).maybeSingle(),
      db.from("kut_uniforms").select("*").eq("department_code", code).order("sort_order"),
      db.from("kut_members").select("*").eq("department_code", code).order("sort_order"),
      db.from("kut_sections").select("*").eq("department_code", code).order("sort_order")
    ]);
    const problem = results.find(r => r.error);
    if (problem) {
      const box = views.get(code);
      box.querySelector('[data-kut-pane="about"]').innerHTML = empty("Данные подразделения не загрузились: " + problem.error.message);
      return;
    }
    content.set(code, {
      department: results[0].data,
      uniforms: results[1].data || [],
      members: results[2].data || [],
      sections: results[3].data || []
    });
    render(code);
  }
  async function refresh() {
    await Promise.all([...views.keys()].map(load));
  }
  async function loadAuth() {
    const result = await db.auth.getUser();
    user = result.data.user || null;
    access = null;
    if (user) {
      const info = await db.from("kut_staff_access").select("*").eq("user_id", user.id).maybeSingle();
      if (info.error) console.warn("Не удалось прочитать права кабинета", info.error);
      access = info.data || null;
    }
    for (const code of views.keys()) render(code);
  }

  function loginForm() {
    const register = activeAuth === "register";
    document.getElementById("kutAccountBody").innerHTML =
      '<form id="kutLoginForm">' +
      (register ? '<label>Имя и фамилия<input name="full_name" maxlength="100" required></label>' : "") +
      '<label>Электронная почта<input name="email" type="email" autocomplete="username" required></label>' +
      '<label>Пароль<input name="password" type="password" autocomplete="' + (register ? "new-password" : "current-password") + '" minlength="8" required></label>' +
      '<button type="submit">' + (register ? "Создать аккаунт" : "Войти") + '</button></form>' +
      '<button type="button" class="kut-switch" data-kut-auth-switch>' +
      (register ? "У меня уже есть аккаунт" : "Создать аккаунт сотрудника") + '</button>' +
      '<div class="kut-muted">Учётная запись сама по себе не даёт права редактирования. Доступ назначается руководством.</div>';
  }

  async function accountView() {
    status("");
    if (!user) { loginForm(); return; }
    const body = document.getElementById("kutAccountBody");
    if (isAdmin()) {
      const [req, personnel] = await Promise.all([
        db.from("kut_access_requests").select("*").order("created_at", { ascending: false }),
        db.from("kut_staff_access").select("*").order("created_at", { ascending: false })
      ]);
      if (req.error || personnel.error) {
        body.innerHTML = empty("Ошибка получения заявок или доступов.");
        status(errorText(req.error || personnel.error), true);
        return;
      }
      requests = req.data || []; staff = personnel.data || [];
      body.innerHTML = '<p>Вход выполнен как <b>' + esc(access.full_name || user.email) + '</b>. Доступ ко всем отделам.</p>' +
        '<h4>Заявки на доступ</h4>' +
        (requests.filter(r => r.status === "pending").length ? requests.filter(r => r.status === "pending").map(r =>
          '<div class="kut-request"><b>' + esc(r.full_name) + '</b><small>' + esc(r.preferred_department || "Отдел не указан") +
          ' · ' + esc(r.note || "") + '</small>' +
          '<button type="button" data-kut-approve="' + esc(r.user_id) + '">Выдать доступ редактора</button>' +
          '<button type="button" data-kut-reject="' + esc(r.user_id) + '">Отклонить</button></div>'
        ).join("") : empty("Новых заявок нет.")) +
        '<h4>Действующие доступы</h4>' +
        (staff.length ? staff.map(a =>
          '<div class="kut-request"><b>' + esc(a.full_name || a.user_id) + '</b>' +
          '<small>' + esc(a.role) + (a.department_code ? " · " + esc(a.department_code) : "") + '</small>' +
          (a.user_id !== user.id ? '<button type="button" data-kut-revoke="' + esc(a.user_id) + '">Отозвать доступ</button>' : "") + '</div>'
        ).join("") : empty("Пока нет назначенных сотрудников.")) +
        '<button type="button" class="kut-switch" data-kut-logout>Выйти из кабинета</button>';
      return;
    }
    if (access) {
      body.innerHTML = '<p>Вы вошли как <b>' + esc(access.full_name || user.email) + '</b>.</p>' +
        '<p>' + esc(access.role === "editor" ? ("Редактирование отдела " + access.department_code) : "Доступ на просмотр") + '</p>' +
        '<button type="button" class="kut-switch" data-kut-logout>Выйти из кабинета</button>';
      return;
    }
    const result = await db.from("kut_access_requests").select("*").eq("user_id", user.id).maybeSingle();
    if (result.error) {
      body.innerHTML = empty("Не удалось получить заявку.");
      status(result.error.message, true);
      return;
    }
    if (result.data) {
      body.innerHTML = '<p>Ваша заявка на доступ получена.</p><p>Отдел: <b>' + esc(result.data.preferred_department) +
        '</b>. Статус: <b>' + esc(result.data.status) + '</b>.</p>' +
        '<button type="button" class="kut-switch" data-kut-logout>Выйти из кабинета</button>';
      return;
    }
    body.innerHTML = '<p>Учётная запись создана. Для редактирования отправьте заявку руководству.</p>' +
      '<form id="kutRequestForm"><label>Имя и фамилия<input name="full_name" required maxlength="100"></label>' +
      '<label>Подразделение<select name="preferred_department" required>' +
      Object.keys(names).map(code => '<option value="' + code + '">' + esc(names[code]) + '</option>').join("") +
      '</select></label><label>Комментарий<textarea name="note" maxlength="350" placeholder="Должность или основание для выдачи доступа"></textarea></label>' +
      '<button type="submit">Направить заявку</button></form>' +
      '<button type="button" class="kut-switch" data-kut-logout>Выйти из кабинета</button>';
  }
  async function openAccount() {
    accountModal.hidden = false;
    await loadAuth();
    await accountView();
  }

  const formField = (key, label, value, attrs = "") =>
    '<label>' + esc(label) + '<input name="' + key + '" value="' + esc(value || "") + '" ' + attrs + '></label>';
  const textField = (key, label, value) =>
    '<label>' + esc(label) + '<textarea name="' + key + '">' + esc(value || "") + '</textarea></label>';

  function openEditor(code, kind, id = "") {
    if (!canEdit(code)) { void openAccount(); return; }
    const entry = content.get(code);
    const table = kind === "about" ? [] : (entry?.[kind] || []);
    const record = table.find(x => x.id === id) || {};
    editor = { code, kind, id, record };
    const label = kind === "about" ? "Описание" : kind === "uniforms" ? "Форма" : kind === "members" ? "Сотрудник" : "Материал";
    document.getElementById("kutEditorTitle").textContent = label + " · " + code;
    const form = document.getElementById("kutEditorForm");
    if (kind === "about") {
      form.innerHTML = textField("introduction", "Описание подразделения", entry?.department?.introduction || "");
    } else if (kind === "uniforms") {
      form.innerHTML =
        formField("title", "Название комплекта", record.title, 'required maxlength="100"') +
        textField("description", "Описание формы и правила ношения", record.description) +
        '<label>Фотография (JPG, PNG или WebP, до 5 МБ)<input type="file" name="file" accept="image/jpeg,image/png,image/webp"></label>' +
        formField("sort_order", "Порядок отображения", record.sort_order ?? 0, 'type="number"');
    } else if (kind === "members") {
      form.innerHTML =
        formField("full_name", "Имя и фамилия", record.full_name, 'required maxlength="100"') +
        formField("rank", "Звание", record.rank, 'maxlength="100"') +
        formField("position", "Должность", record.position, 'maxlength="150"') +
        formField("sort_order", "Порядок отображения", record.sort_order ?? 0, 'type="number"');
    } else {
      form.innerHTML =
        formField("title", "Заголовок материала", record.title, 'required maxlength="100"') +
        textField("content", "Содержание", record.content) +
        formField("sort_order", "Порядок отображения", record.sort_order ?? 0, 'type="number"');
    }
    form.insertAdjacentHTML("beforeend", '<button type="submit">Сохранить изменения</button>');
    editorStatus("");
    editModal.hidden = false;
    form.querySelector("input,textarea")?.focus();
  }
  async function saveEditor(event) {
    event.preventDefault();
    if (!editor || !canEdit(editor.code)) return;
    const { kind, code, id, record } = editor;
    const form = event.currentTarget, values = new FormData(form);
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    editorStatus("Сохранение…");
    let uploaded = "";
    try {
      if (kind === "about") {
        const introduction = String(values.get("introduction") || "").trim();
        const res = await db.from("kut_departments").update({ introduction, updated_at: new Date().toISOString() }).eq("code", code).select("code");
        if (res.error || !res.data?.length) throw res.error || new Error("Изменение не разрешено.");
      } else {
        const table = { uniforms: "kut_uniforms", members: "kut_members", sections: "kut_sections" }[kind];
        const row = { department_code: code, sort_order: Number(values.get("sort_order")) || 0 };
        if (kind === "uniforms") {
          row.title = String(values.get("title") || "").trim();
          row.description = String(values.get("description") || "").trim();
          const file = form.querySelector('input[name="file"]')?.files?.[0];
          if (file) {
            const types = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
            if (!types[file.type] || file.size > 5 * 1024 * 1024) throw new Error("Выберите JPG, PNG или WebP до 5 МБ.");
            uploaded = code + "/" + crypto.randomUUID() + "." + types[file.type];
            const result = await db.storage.from("kut-uniforms").upload(uploaded, file, { contentType: file.type, upsert: false });
            if (result.error) throw result.error;
            row.image_path = uploaded;
          }
        } else if (kind === "members") {
          row.full_name = String(values.get("full_name") || "").trim();
          row.rank = String(values.get("rank") || "").trim();
          row.position = String(values.get("position") || "").trim();
        } else {
          row.title = String(values.get("title") || "").trim();
          row.content = String(values.get("content") || "").trim();
        }
        if ((kind === "members" && !row.full_name) || (kind !== "members" && !row.title))
          throw new Error("Заполните обязательное поле.");
        const query = id ? db.from(table).update(row).eq("id", id).eq("department_code", code)
          : db.from(table).insert(row);
        const res = await query.select("id");
        if (res.error || !res.data?.length) throw res.error || new Error("Изменение не разрешено.");
        // Старое изображение удаляем только после успешного сохранения нового.
        if (kind === "uniforms" && uploaded && record.image_path) {
          void db.storage.from("kut-uniforms").remove([record.image_path]);
        }
      }
      editModal.hidden = true;
      editor = null;
      await load(code);
    } catch (err) {
      if (uploaded) await db.storage.from("kut-uniforms").remove([uploaded]);
      editorStatus(errorText(err), true);
    } finally {
      submit.disabled = false;
    }
  }
  async function removeItem(code, kind, id) {
    if (!canEdit(code) || !["uniforms","members","sections"].includes(kind)) return;
    if (!confirm("Удалить выбранную запись?")) return;
    const record = content.get(code)?.[kind]?.find(x => x.id === id);
    const table = { uniforms: "kut_uniforms", members: "kut_members", sections: "kut_sections" }[kind];
    const res = await db.from(table).delete().eq("id", id).eq("department_code", code).select("id");
    if (res.error || !res.data?.length) { alert(errorText(res.error || new Error("Нет доступа."))); return; }
    if (kind === "uniforms" && record?.image_path)
      void db.storage.from("kut-uniforms").remove([record.image_path]);
    await load(code);
  }

  root.addEventListener("click", event => {
    const tab = event.target.closest("[data-kut-tab]");
    if (tab) {
      const box = tab.closest(".kut-workspace");
      box.querySelectorAll("[data-kut-tab]").forEach(x => x.setAttribute("aria-selected", String(x === tab)));
      box.querySelectorAll("[data-kut-pane]").forEach(x => { x.hidden = x.dataset.kutPane !== tab.dataset.kutTab; });
      return;
    }
    const b = event.target.closest("[data-kut-action]");
    if (!b) return;
    const action = b.dataset.kutAction;
    if (action === "account") void openAccount();
    if (action === "edit") openEditor(b.dataset.kutCode, b.dataset.kutKind, b.dataset.kutId);
    if (action === "delete") void removeItem(b.dataset.kutCode, b.dataset.kutKind, b.dataset.kutId);
  });

  accountModal.addEventListener("click", async event => {
    if (event.target === accountModal || event.target.closest("[data-kut-close]")) { accountModal.hidden = true; return; }
    if (event.target.closest("[data-kut-auth-switch]")) {
      activeAuth = activeAuth === "login" ? "register" : "login";
      loginForm(); status(""); return;
    }
    if (event.target.closest("[data-kut-logout]")) {
      await db.auth.signOut(); user = null; access = null;
      accountModal.hidden = true;
      for (const code of views.keys()) render(code);
      return;
    }
    const approve = event.target.closest("[data-kut-approve]");
    if (approve && isAdmin()) {
      const request = requests.find(r => r.user_id === approve.dataset.kutApprove && r.status === "pending");
      if (!request?.preferred_department) return;
      status("Назначение доступа…");
      const res = await db.from("kut_staff_access").upsert({
        user_id: request.user_id, full_name: request.full_name,
        role: "editor", department_code: request.preferred_department
      }, { onConflict: "user_id" });
      if (res.error) { status(res.error.message, true); return; }
      const done = await db.from("kut_access_requests").update({ status: "approved" }).eq("user_id", request.user_id);
      if (done.error) { status(done.error.message, true); return; }
      await accountView(); return;
    }
    const reject = event.target.closest("[data-kut-reject]");
    if (reject && isAdmin()) {
      const res = await db.from("kut_access_requests").update({ status: "rejected" }).eq("user_id", reject.dataset.kutReject);
      if (res.error) { status(res.error.message, true); return; }
      await accountView(); return;
    }
    const revoke = event.target.closest("[data-kut-revoke]");
    if (revoke && isAdmin() && revoke.dataset.kutRevoke !== user.id) {
      if (!confirm("Отозвать доступ сотрудника?")) return;
      const res = await db.from("kut_staff_access").delete().eq("user_id", revoke.dataset.kutRevoke);
      if (res.error) { status(res.error.message, true); return; }
      await accountView();
    }
  });
  accountModal.addEventListener("submit", async event => {
    event.preventDefault();
    if (event.target.id === "kutLoginForm") {
      const form = event.target, values = new FormData(form);
      const email = String(values.get("email") || "").trim();
      const password = String(values.get("password") || "");
      status(activeAuth === "register" ? "Создание аккаунта…" : "Проверка входа…");
      const res = activeAuth === "register"
        ? await db.auth.signUp({
            email, password, options: { data: { full_name: String(values.get("full_name") || "").trim() } }
          })
        : await db.auth.signInWithPassword({ email, password });
      if (res.error) { status(res.error.message, true); return; }
      if (activeAuth === "register" && !res.data.session) {
        status("Аккаунт создан. Подтвердите электронную почту, затем войдите.");
        activeAuth = "login"; loginForm(); return;
      }
      await loadAuth(); await accountView();
      return;
    }
    if (event.target.id === "kutRequestForm" && user && !access) {
      const values = new FormData(event.target);
      const res = await db.from("kut_access_requests").insert({
        user_id: user.id,
        full_name: String(values.get("full_name") || "").trim(),
        preferred_department: String(values.get("preferred_department") || ""),
        note: String(values.get("note") || "").trim()
      });
      if (res.error) { status(res.error.message, true); return; }
      await accountView();
    }
  });
  editModal.addEventListener("click", event => {
    if (event.target === editModal || event.target.closest("[data-kut-close]")) { editModal.hidden = true; editor = null; }
  });
  document.getElementById("kutEditorForm").addEventListener("submit", saveEditor);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      accountModal.hidden = true; editModal.hidden = true; editor = null;
    }
  });
  db.auth.onAuthStateChange(() => {
    // Не вызываем запросы Supabase синхронно внутри callback Auth.
    setTimeout(() => { void loadAuth(); }, 0);
  });
  mount();
  void loadAuth();
  void refresh();
  window.kutDepartmentSpaces = { refresh, openAccount, canEdit };
})();
