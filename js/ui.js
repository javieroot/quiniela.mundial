function render(view) {
  const container = document.getElementById("app");
  if (!container) {
    console.error("No existe #app");
    return;
  }
  container.innerHTML = view;
}

function setContent(view) {
  const content = document.getElementById("content");
  if (!content) {
    console.error("No existe #content");
    return;
  }
  content.innerHTML = view;
}
