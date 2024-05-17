const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");

const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const deleteAll = document.querySelector(".delete-all");

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}
class Running extends Workout {
  type = "running";

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = "cycling";

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #mapZoom = 13;
  #mapEvent;
  #workouts = [];
  #workoutEdit;

  constructor() {
    this._getPosition();

    this.workoutTokens = {};

    this._getLocalStorage();

    this.visibilityBtn();

    containerWorkouts.addEventListener(
      "click",
      function (e) {
        if (e.target.classList.contains("workout__edit")) {
          this._editWorkout(e);
        }
        if (e.target.classList.contains("workout__delete")) {
          this._deleteWorkout(e);
        }
      }.bind(this)
    );

    form.addEventListener("submit", this._newWorkout.bind(this));

    inputType.addEventListener("change", this._toggleElevationField);

    containerWorkouts.addEventListener("click", this._moveTopPopup.bind(this));

    deleteAll.addEventListener("click", this._deleteAll.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Could not get your position");
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoom);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }
  _showForm(event) {
    this.#mapEvent = event;
    form.classList.remove("hidden");
    inputDistance.focus();
  }
  _hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        "";
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPos = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();

    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout running, create runnig object
    if (type === "running") {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPos(distance, duration, cadence)
      )
        return alert("Inputs have to be positive numbers!");

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // if workout cycling, create cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPos(distance, duration)
      )
        return alert("Inputs have to be positive numbers!");

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    if (this.#workoutEdit) {
      this._updateWorkout();
    } else {
      // add new object to workout array
      this.#workouts.push(workout);
      // render workout on map as marker
      this._renderWorkoutMarker(workout);
      // render workout on least
      this._renderWorkout(workout);
      // hide form + clear input fields
      this._hideForm();
      // set local storage
      this._setLocalStorage();

      this.visibilityBtn();
    }
  }
  _renderWorkoutMarker(workout) {
    const myIcon = L.icon({
      iconUrl: "./assets/mapicon.png",
      iconSize: [40, 40],
      iconAnchor: [22, 40],
      popupAnchor: [-2, -40],
    });

    const marker = L.marker(workout.coords, { icon: myIcon })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.description}`)
      .openPopup();

    this.workoutTokens[workout.id] = marker;
  }
  // display marker
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <div class="workout__title">
          <h2>${workout.description}</h2>
          <button class="workout__edit">Edit</button>
          <button class="workout__delete">Delete</button>
          </div>
          <div class="workout__details">
            <span class="workout__icon">dist</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">time </span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          `;
    if (workout.type === "running")
      html += ` 
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
          <span class="workout__icon">cad </span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
          </div>
  </li>
  `;
    if (workout.type === "cycling")
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">e.g.</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>
  `;

    form.insertAdjacentHTML("afterend", html);
  }
  _moveTopPopup(e) {
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
    });
  }
  _editWorkout(e) {
    e.preventDefault();

    const workoutEl = e.target.closest(".workout");

    if (!workoutEl) return;

    const workoutId = workoutEl.dataset.id;
    const workoutIndex = this.#workouts.findIndex(
      (work) => work.id === workoutId
    );

    if (workoutIndex === -1) return;

    const workout = this.#workouts[workoutIndex];

    // populate form fields with workout data for editing
    inputType.value = workout.type;
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;

    if (workout.type === "running") {
      inputElevation.value = "";
      inputCadence.value = workout.cadence;
    } else if (workout.type === "cycling") {
      inputElevation.value = workout.elevationGain;
      inputCadence.value = "";
    }

    // set the edited workout as the current edit workout
    this.#workoutEdit = workout;

    // show the form
    form.classList.remove("hidden");
    inputDistance.focus();
  }
  _updateWorkout() {
    if (!this.#workoutEdit) {
      console.error("No workout to update.");
      return;
    }

    if (!this.#mapEvent || !this.#mapEvent.latlng) {
      console.error("Map event or latlng is undefined");
      return;
    }

    const workoutId = this.#workoutEdit.id;

    const workoutIndex = this.#workouts.findIndex(
      (work) => work.id === workoutId
    );

    if (workoutIndex === -1) {
      console.error("Workout not found.");
      return;
    }

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const coords = this.#mapEvent.latlng;

    this.#workouts[workoutIndex].type = type;
    this.#workouts[workoutIndex].distance = distance;
    this.#workouts[workoutIndex].duration = duration;
    this.#workouts[workoutIndex].coords = coords;

    if (type === "running") {
      const cadence = +inputCadence.value;
      this.#workouts[workoutIndex].cadence = cadence;
    } else if (type === "cycling") {
      const elevation = +inputElevation.value;
      this.#workouts[workoutIndex].elevationGain = elevation;
    }

    // update the workout in the list
    this._removeWorkoutMarker(workoutId);
    this._renderWorkoutMarker(this.#workouts[workoutIndex]);

    const workoutElement = document.querySelector(`[data-id="${workoutId}"]`);

    if (workoutElement) {
      workoutElement.remove();
    }

    this._renderWorkout(this.#workouts[workoutIndex]);

    this._hideForm();

    this._setLocalStorage();

    this.#workoutEdit = null;
  }

  _removeWorkoutMarker(id) {
    const marker = this.workoutTokens[id];
    if (marker) {
      marker.remove();
      delete this.workoutTokens[id];
    }
  }

  _deleteWorkout(e) {
    e.preventDefault();

    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;

    const workoutId = workoutEl.dataset.id;
    const workoutIndex = this.#workouts.findIndex(
      (work) => work.id === workoutId
    );

    if (workoutIndex === -1) return;

    // Remove workout from array
    this.#workouts.splice(workoutIndex, 1);

    workoutEl.remove();

    // remove workout marker from the map
    this._removeWorkoutMarker(workoutId);

    // set local storage to all workouts
    this._setLocalStorage();

    // delete all button visibility
    this.visibilityBtn();
  }

  _deleteAll() {
    this.#workouts = [];

    for (const id in this.workoutTokens) {
      this._removeWorkoutMarker(id);
    }

    this._setLocalStorage();

    document
      .querySelectorAll(".workout")
      .forEach((element) => element.remove());

    this.visibilityBtn();
  }

  visibilityBtn() {
    if (this.#workouts.length >= 2) {
      deleteAll.style.display = "block";
    } else {
      deleteAll.style.display = "none";
    }
  }
}

const app = new App();
