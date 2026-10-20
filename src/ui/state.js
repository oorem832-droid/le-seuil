// État d'interface partagé et registres d'événements (délégation dans main.js).
export const ui = {
  route: "accueil", params: [], loginMode: "login", libTab: "sujets", libQuery: "", journalQuery: "", journalWeek: "all", journalTab: "notes",
  filterCat: "Tous", query: "", adminTab: "vue", editing: null, confirm: null, coach: { filters: { programme: "all", plan: "all", week: "all" }, current: null, data: null, list: null, calendar: null },
  admin: {}, saveState: "", onboarding: { step: 0, answers: {} }, busy: false,
};
export const actions = {};   // data-act="nom" → (el, event)
export const forms = {};     // <form id="…"> → (form, event)
export const inputs = [];    // [(target) => bool] pour l'événement input
export const changes = [];   // [(target) => bool] pour l'événement change
export const hooks = { render: () => {}, rerender: () => {}, go: () => {} };
export const render = (...a) => hooks.render(...a);
export const rerender = (...a) => hooks.rerender(...a);
export const go = (...a) => hooks.go(...a);
