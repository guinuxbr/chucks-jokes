const jokeContainer = document.querySelector("#joke-container");
const jokeText = document.querySelector("#joke");
const twitterBtn = document.querySelector("#twitter");
const newJokeBtn = document.querySelector("#new-joke");
const loader = document.querySelector("#loader");
const inputSearch = document.querySelector("#input-search");
const message = document.querySelector(".message");

// Event Listeners
newJokeBtn.addEventListener("click", searchJoke);
twitterBtn.addEventListener("click", tweetJoke);


// Show Loading
function showLoadingSpinner() {
  loader.hidden = false;
  jokeContainer.hidden = true;
  message.hidden = true;
}

// Hide Loading
function hideLoadingSpinner() {
  if (!loader.hidden) {
    jokeContainer.hidden = false;
    message.hidden = false;
    loader.hidden = true;
  }
}

// Get joke from API
async function getJoke() {
  inputSearch.value = "";
  showLoadingSpinner();
  const apiURL = "https://api.chucknorris.io/jokes/random";
  try {
    const response = await fetch(apiURL);
    const data = await response.json();

    if (data.value.length > 100) {
      jokeText.classList.add("long-joke");
    } else {
      jokeText.classList.remove("long-joke");
    }
    jokeText.innerText = data.value;
    // Stop Loader, Show the Joke
    hideLoadingSpinner();

  } catch (error) {
    message.innerText = `There was an error. Try again in a few seconds`;
  }
}

// Tweet the Joke
function tweetJoke() {
  const joke = jokeText.innerText;
  const twitterURL = `https://twitter.com/intent/tweet?text=${joke}`;
  window.open(twitterURL, "_blank");
}

// Searching for a joke
async function searchJoke() {
  showLoadingSpinner();
  const apiSearchURL = "https://api.chucknorris.io/jokes/search?query="

  if (inputSearch.value === "") {
    getJoke();
  } else {
    try {
      const response = await fetch(`${apiSearchURL}${inputSearch.value}`);
      const data = await response.json();
      const totalOfJokes = data.total;
      const randomJoke = Math.floor(Math.random() * totalOfJokes);
      
      // Showing the total of found jokes
      message.innerText = `We found ${totalOfJokes} jokes which contains the term "${inputSearch.value}".`;
      
      // Resize font if joke is long
      if (data.result[randomJoke].value.length > 80) {
        jokeText.classList.add("long-joke");
      } else {
        jokeText.classList.remove("long-joke");
      }
      jokeText.innerText = data.result[randomJoke].value;

      // Stop Loader, Show the Joke
      hideLoadingSpinner();
    } catch (error) {
      message.innerText = `There was an error. Try again in a few seconds`;
    }
  }
}

// On load
getJoke();
