// Local-calendar date helpers. `Date#toISOString` is always UTC, so slicing it
// rolls the day over at UTC midnight — wrong for anyone west of Greenwich (e.g.
// logging an evening rep in PST counts toward tomorrow). These return the date
// as it reads on the user's own wall clock.

export function localDate(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function localMonth(d = new Date()) {
  return localDate(d).slice(0, 7)
}
