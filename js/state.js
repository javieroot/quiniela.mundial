let currentUser = JSON.parse(localStorage.getItem("pronostix_user"));

function setCurrentUser(user) {
  currentUser = user;
  if (user) {
    localStorage.setItem("pronostix_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("pronostix_user");
  }
}
