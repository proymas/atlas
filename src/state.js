export const state = {
  idea: '',
  questions: [],
  answers: [],
  index: 0,
  report: null,
};

export function resetState() {
  state.idea = '';
  state.questions = [];
  state.answers = [];
  state.index = 0;
  state.report = null;
}
