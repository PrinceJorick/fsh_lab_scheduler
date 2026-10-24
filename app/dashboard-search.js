document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('lab-search');
  if (!input) return;
  const cards = [...document.querySelectorAll('.lab-card')];
  const count = document.getElementById('lab-result-count');
  const empty = document.getElementById('lab-no-results');
  input.addEventListener('input', () => {
    const term = input.value.trim().toLowerCase();
    const matching = cards.filter(card => card.textContent.toLowerCase().includes(term));
    cards.forEach(card => { card.hidden = !matching.includes(card); });
    count.textContent = `${matching.length} ${matching.length === 1 ? 'room' : 'rooms'}`;
    empty.hidden = matching.length > 0;
  });
});
