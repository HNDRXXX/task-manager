// ===============================
// Nebula Tasks — Frontend only
// (PL) UI po angielsku, komentarze po polsku (każda linia)
// (PL) Zero bibliotek; dane w localStorage; czysty DOM
// ===============================

// (PL) Klucz do przechowywania listy zadań w localStorage przeglądarki
const STORAGE_KEY = "nebula-tasks-v1";

// (PL) Funkcja fabrykująca nowy pusty obiekt zadania (tzw. draft)
function emptyTask() {
  return { // (PL) Zwracamy obiekt z polami zadania
    id: crypto.randomUUID(), // (PL) Generujemy unikalne ID po stronie przeglądarki
    title: "",               // (PL) Tytuł zadania (wymagany przy zapisie)
    description: "",         // (PL) Dłuższy opis zadania
    priority: "Medium",      // (PL) Priorytet domyślny: Medium
    dueDate: "",             // (PL) Data terminu w formacie YYYY-MM-DD
    status: "Todo",          // (PL) Status startowy: Todo
    tags: []                 // (PL) Tablica tagów (stringi, bez #)
  };
}

// (PL) Przykładowe zadania startowe, gdy w localStorage nic nie ma
const seedTasks = [
  { // (PL) Pierwsze przykładowe zadanie
    id: crypto.randomUUID(), // (PL) ID przykładowe
    title: "Design landing screen", // (PL) Tytuł
    description: "Create the hero section and CTA buttons.", // (PL) Opis
    priority: "High", // (PL) Priorytet wysoki
    dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), // (PL) Termin: jutro
    status: "In Progress", // (PL) Status: w trakcie
    tags: ["ui", "design"] // (PL) Tagi
  },
  { // (PL) Drugie przykładowe zadanie
    id: crypto.randomUUID(), // (PL) ID przykładowe
    title: "Write API docs", // (PL) Tytuł
    description: "Document authentication and task endpoints.", // (PL) Opis
    priority: "Medium", // (PL) Priorytet średni
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), // (PL) Termin za 3 dni
    status: "Todo", // (PL) Status: do zrobienia
    tags: ["docs", "backend"] // (PL) Tagi
  },
  { // (PL) Trzecie przykładowe zadanie
    id: crypto.randomUUID(), // (PL) ID przykładowe
    title: "QA regression", // (PL) Tytuł
    description: "Run the quick smoke tests before demo.", // (PL) Opis
    priority: "Low", // (PL) Priorytet niski
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), // (PL) Termin za 5 dni
    status: "Done", // (PL) Status: zrobione
    tags: ["qa"] // (PL) Tagi
  }
];

// (PL) Wczytuje listę zadań z localStorage albo zwraca kopię seedTasks
function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY); // (PL) Odczyt surowego JSON-a z localStorage
  if (!raw) return seedTasks.slice(); // (PL) Jeżeli brak danych, zwróć kopię przykładowych
  try { // (PL) Próbujemy sparsować JSON
    return JSON.parse(raw); // (PL) Zwracamy sparsowaną tablicę zadań
  } catch { // (PL) Gdy JSON jest uszkodzony
    return seedTasks.slice(); // (PL) Wracamy do przykładowych danych
  }
}

// (PL) Zapisuje obecną listę zadań do localStorage w formacie JSON
function saveTasks(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); // (PL) Nadpisanie klucza JSON-em
}

// (PL) Zmienne “stanu” aplikacji (proste globalne)
let tasks = loadTasks();  // (PL) Lista zadań aktualnie w pamięci
let draft = emptyTask();  // (PL) Obiekt formularza, do tworzenia/edycji
let editingId = null;     // (PL) Jeżeli != null, to edytujemy zadanie o tym ID

// (PL) Pobieramy referencje do elementów formularza i listy po ID
const $title = document.getElementById("title"); // (PL) Input tytułu
const $description = document.getElementById("description"); // (PL) Textarea opisu
const $dueDate = document.getElementById("dueDate"); // (PL) Input daty
const $status = document.getElementById("status"); // (PL) Select statusu
const $prioritySeg = document.getElementById("priority-seg"); // (PL) Kontener segmentu priorytetu
const $tagInput = document.getElementById("tag-input"); // (PL) Input nowego tagu
const $tagList = document.getElementById("tag-list"); // (PL) Kontener renderowanych tagów

const $createBtn = document.getElementById("create-btn"); // (PL) Przycisk “Add task”
const $saveBtn = document.getElementById("save-btn"); // (PL) Przycisk “Save changes”
const $cancelBtn = document.getElementById("cancel-btn"); // (PL) Przycisk “Cancel”
const $formTitle = document.getElementById("form-title"); // (PL) Nagłówek formularza (tekst)

const $resetSeed = document.getElementById("reset-seed"); // (PL) Przycisk resetu danych przykładowych

const $search = document.getElementById("search"); // (PL) Pole wyszukiwania
const $statusFilter = document.getElementById("status-filter"); // (PL) Filtr statusu
const $priorityFilter = document.getElementById("priority-filter"); // (PL) Filtr priorytetu
const $sortKey = document.getElementById("sort-key"); // (PL) Wybór pola sortowania
const $sortDir = document.getElementById("sort-dir"); // (PL) Przycisk zmiany kierunku sortowania
const $taskList = document.getElementById("task-list"); // (PL) Kontener listy zadań

const $tpl = document.getElementById("task-item-template"); // (PL) Template HTML pojedynczej karty zadania

// (PL) Przepisuje wartości z obiektu draft do pól formularza i odświeża tagi
function syncDraftToForm() {
  $title.value = draft.title; // (PL) Ustaw tytuł w input
  $description.value = draft.description; // (PL) Ustaw opis w textarea
  $dueDate.value = draft.dueDate; // (PL) Ustaw datę w input
  $status.value = draft.status; // (PL) Ustaw status w select

  // (PL) Ustaw klasę “active” na przycisku odpowiadającym bieżącemu priorytetowi
  Array.from($prioritySeg.querySelectorAll(".segmented-item")).forEach(btn => { // (PL) Iteracja po przyciskach
    btn.classList.toggle("active", btn.dataset.val === draft.priority); // (PL) Przełącz klasę aktywności
  });

  renderDraftTags(); // (PL) Odtwórz wygląd listy tagów (chipsów) z draftu
}

// (PL) Renderuje chipsy-tagów w formularzu na podstawie draft.tags
function renderDraftTags() {
  $tagList.innerHTML = ""; // (PL) Wyczyść obszar tagów
  draft.tags.forEach(tag => { // (PL) Dla każdego tagu
    const el = document.createElement("span"); // (PL) Stwórz element span
    el.className = "tag"; // (PL) Nadaj klasę stylującą chip
    el.innerHTML = `${escapeHtml(tag)} <span class="x" title="Remove">×</span>`; // (PL) Wstaw nazwę i iks do usuwania
    el.querySelector(".x").addEventListener("click", () => { // (PL) Reakcja na klik w “x”
      draft.tags = draft.tags.filter(t => t !== tag); // (PL) Usuń dany tag z tablicy
      renderDraftTags(); // (PL) Przerysuj listę tagów
    }); // (PL) Koniec obsługi kliknięcia
    $tagList.appendChild(el); // (PL) Dodaj chip do kontenera
  }); // (PL) Koniec pętli tagów
}

// (PL) Zabezpieczenie przed wstrzyknięciem HTML — zamiana znaków specjalnych
function escapeHtml(s) {
  return s.replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); // (PL) Mapujemy każdy znak na encję HTML
}

// (PL) Renderuje listę zadań wg bieżących filtrów, wyszukiwania i sortowania
function renderList() {
  const query = $search.value.trim().toLowerCase(); // (PL) Tekst wyszukiwany (lowercase)
  const statusF = $statusFilter.value; // (PL) Wybrany filtr statusu
  const priorityF = $priorityFilter.value; // (PL) Wybrany filtr priorytetu
  const sortBy = $sortKey.value; // (PL) Pole sortowania
  const dir = $sortDir.textContent.trim() === "▲" ? 1 : -1; // (PL) Kierunek: ▲ = rosnąco (1), ▼ = malejąco (-1)

  // (PL) Najpierw filtrujemy listę zadań
  let list = tasks.filter(t => { // (PL) Przechodzimy po wszystkich zadaniach
    const matchesText = // (PL) Prawda, gdy tytuł/opis/tag zawiera szukany tekst
      t.title.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.tags.some(x => x.toLowerCase().includes(query));
    const matchesStatus = statusF === "All" || t.status === statusF; // (PL) Filtr statusu
    const matchesPriority = priorityF === "All" || t.priority === priorityF; // (PL) Filtr priorytetu
    return matchesText && matchesStatus && matchesPriority; // (PL) Przepuść tylko pasujące
  });

  // (PL) Następnie sortujemy według wybranego kryterium i kierunku
  list.sort((a, b) => { // (PL) Funkcja sortująca
    if (sortBy === "dueDate") { // (PL) Sort po dacie terminu
      return (new Date(a.dueDate) - new Date(b.dueDate)) * dir; // (PL) Różnica czasów * kierunek
    }
    if (sortBy === "priority") { // (PL) Sort po priorytecie
      const ord = { High: 3, Medium: 2, Low: 1 }; // (PL) Mapa priorytetów na liczby
      return (ord[a.priority] - ord[b.priority]) * dir; // (PL) Różnica wartości * kierunek
    }
    if (sortBy === "status") { // (PL) Sort po statusie
      const ord = { "Todo": 1, "In Progress": 2, "Done": 3 }; // (PL) Mapa statusów na liczby
      return (ord[a.status] - ord[b.status]) * dir; // (PL) Różnica wartości * kierunek
    }
    return a.title.localeCompare(b.title) * dir; // (PL) Domyślnie sort po tytule alfabetycznie
  });

  $taskList.innerHTML = ""; // (PL) Czyścimy widok listy przed renderem

  for (const t of list) { // (PL) Renderujemy każdy element listy
    const node = $tpl.content.firstElementChild.cloneNode(true); // (PL) Klonujemy zawartość <template> (pojedynczą kartę)

    const $badge = node.querySelector(".status-badge"); // (PL) Kropka statusu
    const $title = node.querySelector(".task-title"); // (PL) Miejsce na tytuł
    const $desc = node.querySelector(".task-desc"); // (PL) Miejsce na opis
    const $tags = node.querySelector(".task-tags"); // (PL) Kontener tagów
    const $due = node.querySelector(".due"); // (PL) Miejsce na datę “Due”
    const $priority = node.querySelector(".priority-pill"); // (PL) Pigułka priorytetu

    $title.textContent = t.title || "(no title)"; // (PL) Ustaw tytuł, fallback gdy pusty
    $desc.textContent = t.description; // (PL) Ustaw opis
    $priority.textContent = `Priority: ${t.priority}`; // (PL) Tekst pigułki priorytetu
    $priority.classList.add("priority-" + t.priority); // (PL) Klasa wizualna zgodna z priorytetem
    $due.textContent = t.dueDate ? `Due: ${t.dueDate}` : "No due date"; // (PL) Wyświetl termin lub komunikat braku

    if (t.status === "Todo") $badge.classList.add("status-todo"); // (PL) Kolor kropki dla Todo
    else if (t.status === "In Progress") $badge.classList.add("status-progress"); // (PL) Dla In Progress
    else $badge.classList.add("status-done"); // (PL) Dla Done

    $tags.innerHTML = ""; // (PL) Wyczyść kontener tagów
    t.tags.forEach(tag => { // (PL) Dodaj każdy tag
      const el = document.createElement("span"); // (PL) Utwórz element
      el.className = "tag"; // (PL) Styl pigułki tagu
      el.textContent = tag; // (PL) Tekst tagu
      $tags.appendChild(el); // (PL) Dołącz do karty
    });

    node.querySelector(".toggle-status").addEventListener("click", () => { // (PL) Klik w “⟳” – cykl statusu
      const order = ["Todo", "In Progress", "Done"]; // (PL) Kolejność stanów
      const idx = order.indexOf(t.status); // (PL) Pozycja aktualnego
      t.status = order[(idx + 1) % order.length]; // (PL) Następny stan cyklicznie
      saveTasks(tasks); // (PL) Zapisz do localStorage
      renderList(); // (PL) Odśwież listę
    });

    node.querySelector(".edit").addEventListener("click", () => startEdit(t.id)); // (PL) Klik “✎” – rozpocznij edycję

    node.querySelector(".delete").addEventListener("click", () => { // (PL) Klik kosza – usuń zadanie
      tasks = tasks.filter(x => x.id !== t.id); // (PL) Odfiltruj to zadanie z listy
      saveTasks(tasks); // (PL) Zapisz zmiany
      renderList(); // (PL) Odśwież widok
      if (editingId === t.id) cancelEdit(); // (PL) Jeśli usuwałeś edytowane, przerwij edycję
    });

    $taskList.appendChild(node); // (PL) Dodaj gotową kartę do listy na stronie
  } // (PL) Koniec pętli po zadaniach
}

// (PL) Rozpoczyna edycję zadania: ładuje dane do draftu i przełącza UI
function startEdit(id) {
  const t = tasks.find(x => x.id === id); // (PL) Znajdź zadanie o podanym ID
  if (!t) return; // (PL) Jeśli nie znaleziono, nic nie rób
  editingId = id; // (PL) Zapamiętaj, które ID jest edytowane
  draft = JSON.parse(JSON.stringify(t)); // (PL) Głęboka kopia (prosty trik z JSON)
  $formTitle.textContent = "Edit task"; // (PL) Zmień nagłówek formularza
  $createBtn.classList.add("hidden"); // (PL) Ukryj “Add task”
  $saveBtn.classList.remove("hidden"); // (PL) Pokaż “Save changes”
  $cancelBtn.classList.remove("hidden"); // (PL) Pokaż “Cancel”
  syncDraftToForm(); // (PL) Wypełnij pola formularza danymi
}

// (PL) Anuluje edycję i przywraca formularz do trybu tworzenia
function cancelEdit() {
  editingId = null; // (PL) Brak edytowanego ID
  draft = emptyTask(); // (PL) Wyczyść draft do stanu pustego
  $formTitle.textContent = "Create new task"; // (PL) Zmień nagłówek
  $createBtn.classList.remove("hidden"); // (PL) Pokaż “Add task”
  $saveBtn.classList.add("hidden"); // (PL) Ukryj “Save changes”
  $cancelBtn.classList.add("hidden"); // (PL) Ukryj “Cancel”
  syncDraftToForm(); // (PL) Odsyncuj pola (wyczyść)
}

// (PL) Dodaje nowe zadanie na podstawie draftu
function addTask() {
  if (!draft.title.trim()) { // (PL) Walidacja: tytuł jest wymagany
    alert("Title is required."); // (PL) Komunikat o błędzie
    return; // (PL) Przerwij funkcję, nie dodawaj
  }
  tasks = [{ ...draft }, ...tasks]; // (PL) Dodaj kopię draftu na początek listy
  saveTasks(tasks); // (PL) Zapisz do localStorage
  cancelEdit(); // (PL) Wyczyść formularz / przełącz tryb
  renderList(); // (PL) Odśwież widok
}

// (PL) Zapisuje zmiany w edytowanym zadaniu
function saveEdit() {
  if (editingId == null) return; // (PL) Jeśli nic nie edytujemy, wyjdź
  if (!draft.title.trim()) { // (PL) Walidacja tytułu
    alert("Title is required."); // (PL) Komunikat o błędzie
    return; // (PL) Przerwij zapis
  }
  tasks = tasks.map(t => t.id === editingId ? { ...draft } : t); // (PL) Podmień edytowany element
  saveTasks(tasks); // (PL) Zapisz do localStorage
  cancelEdit(); // (PL) Wyczyść tryb edycji
  renderList(); // (PL) Odśwież widok listy
}

// ===============================
// ZDARZENIA UI (obsługa interakcji)
// ===============================

// (PL) Klik w segment priorytetu — ustaw wybrany priorytet w drafcie
$prioritySeg.addEventListener("click", (e) => { // (PL) Nasłuchiwanie kliknięć na kontenerze
  const btn = e.target.closest(".segmented-item"); // (PL) Szukamy najbliższego guzika segmentu
  if (!btn) return; // (PL) Jeśli klik nie był w guzik – wyjdź
  draft.priority = btn.dataset.val; // (PL) Przypisz priorytet z data-val
  syncDraftToForm(); // (PL) Odśwież klasy active i tagi
});

// (PL) Wpisanie tagu i wciśnięcie Enter dodaje go do tablicy tagów
$tagInput.addEventListener("keydown", (e) => { // (PL) Nasłuch klawiszy w input tagu
  if (e.key === "Enter") { // (PL) Działamy tylko na Enter
    const v = $tagInput.value.trim(); // (PL) Wartość bez spacji
    if (v) { // (PL) Jeśli nie puste
      if (!draft.tags.includes(v)) draft.tags.push(v); // (PL) Dodaj, jeśli jeszcze nie istnieje
      $tagInput.value = ""; // (PL) Wyzeruj input
      renderDraftTags(); // (PL) Odrób wyświetlanie chipów
    }
  }
});

// (PL) Synchronizacja pól formularza z obiektem draft podczas pisania
$title.addEventListener("input", e => draft.title = e.target.value); // (PL) Zmiana tytułu
$description.addEventListener("input", e => draft.description = e.target.value); // (PL) Zmiana opisu
$dueDate.addEventListener("input", e => draft.dueDate = e.target.value); // (PL) Zmiana daty
$status.addEventListener("input", e => draft.status = e.target.value); // (PL) Zmiana statusu

// (PL) Podpięcie akcji przycisków formularza
$createBtn.addEventListener("click", addTask); // (PL) Klik w “Add task” wywołuje dodanie
$saveBtn.addEventListener("click", saveEdit); // (PL) Klik w “Save changes” zapisuje edycję
$cancelBtn.addEventListener("click", cancelEdit); // (PL) Klik w “Cancel” anuluje edycję

// (PL) Gdy zmienia się wyszukiwarka/filtry/sort-key — przerysuj listę
[$search, $statusFilter, $priorityFilter, $sortKey].forEach($el => { // (PL) Zbiorcze podpięcie
  $el.addEventListener("input", renderList); // (PL) Każda zmiana powoduje odświeżenie listy
});

// (PL) Klik w przycisk kierunku sortowania — zamiana ▲/▼ i odświeżenie
$sortDir.addEventListener("click", () => {
  $sortDir.textContent = $sortDir.textContent.trim() === "▲" ? "▼" : "▲"; // (PL) Przełącz symbol
  renderList(); // (PL) Przerysuj listę z nowym kierunkiem
});

// (PL) Podpięcie resetu: nadpisuje listę przykładowymi danymi
$resetSeed.addEventListener("click", () => {
  if (confirm("Replace current data with sample tasks?")) { // (PL) Potwierdzenie akcji przez użytkownika
    tasks = seedTasks.slice(); // (PL) Podmień listę na kopię seedTasks
    saveTasks(tasks); // (PL) Zapisz do localStorage
    renderList(); // (PL) Odśwież widok listy
    cancelEdit(); // (PL) Wróć do trybu tworzenia z czystym formularzem
  }
});

// (PL) Start aplikacji po pełnym zainicjowaniu drzewa DOM
document.addEventListener("DOMContentLoaded", () => {
  cancelEdit();  // (PL) Ustaw formularz w tryb “Create new task” i wyczyść draft
  renderList();  // (PL) Wyrenderuj listę zadań z localStorage/seed
});
