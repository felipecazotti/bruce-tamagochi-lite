/**
 * CONSTANTES
 */

const storage = require('storage');
const display = require('display');
const keyboard = require('keyboard');
const dialog = require('dialog');

const SCREEN_WIDTH = display.width();
const SCREEN_HEIGHT = display.height();

const fsChoice = dialog.choice([
  ["SD", "sd"],
  ["LittleFS", "fs"]
]);

const pathStorage = {fs: fsChoice, path: "/BruceAppData/Tamagochi/Pet.json"};

const pastelColors = {
  "Peach": display.color(255, 223, 186),
  "Mint": display.color(186, 255, 201),
  "Pink": display.color(255, 186, 255),
  "Blue": display.color(186, 225, 255),
  "Yellow": display.color(255, 255, 186),
  "White": display.color(255, 255, 255),
  "Lavender": display.color(230, 230, 250),
  "Coral": display.color(255, 127, 80),
  "Aqua": display.color(127, 255, 212),
  "Beige": display.color(245, 245, 220)
};

const faceColors = {
  "Black": display.color(0, 0, 0),
  "White": display.color(255, 255, 255),
  "Red": display.color(255, 0, 0),
  "Blue": display.color(0, 0, 255),
  "Green": display.color(0, 255, 0),
  "Purple": display.color(128, 0, 128)
};
var currentBgColor = pastelColors["Peach"];
var faceColor = faceColors["Black"];


/**
 * UTILS
 */
// Matematico
function computeAccumulatedProgress(elapsedMilisseconds, ratePerHour) {
  const elapsedHours =  elapsedMilisseconds / (60 * 60 * 1000);
  return Math.floor(elapsedHours * ratePerHour);
}

function clamp(value, min, max, defaultValue) {
  return Math.min(Math.max(min, value !== undefined ? value : defaultValue), max);
}

// Pet
function getNewPet() {
  display.fill(currentBgColor);
  display.setTextColor(faceColor);
  display.setTextSize(2);
  const name = keyboard.keyboard("", 12, "Pet's name?") || "Gotchi";
  const type = dialog.choice([["Cat", "cat"], ["Dog", "dog"], ["Bird", "bird"]]) || "cat";
  return new Pet(name, type);
}

function loadPet() {
  try{
    const stringPet = storage.read(pathStorage);
    const jsonPet = JSON.parse(stringPet);
    return new Pet(jsonPet.name, jsonPet.type, jsonPet.hunger, jsonPet.cleanliness,
                       jsonPet.happiness, jsonPet.timeLastFed, jsonPet.timeLastPet, jsonPet.timeLastCleaned);
  } catch(readException) {
    dialog.error("Nenhum Pet encontrado, criando um novo...", true);
    const newPet = getNewPet();
    newPet.save();
    return newPet;
  }
}

function drawPet(pet) {
  const textYSpacing = 14;

  const faces = {
    cat: [" >_< ", "=^_^=", " ^-^ "],
    dog: [" T_T ", " o_o ", " ^_^ "],
    bird: [" x_x ", " -_- ", " ^v^ "]
  };

  display.fill(currentBgColor);
  display.setTextColor(faceColor);
  display.setTextSize(2);

  // Include cleanliness in state calculation
  const stateIndex = (pet.hunger >= 70 || pet.happiness <= 30 || pet.cleanliness <= 30) ? 0 :
                   (pet.hunger >= 30 || pet.happiness <= 50 || pet.cleanliness <= 50) ? 1 : 2;

  const face = faces[pet.type][stateIndex];
  const faceWidth = face.length * 12;
  const faceX = Math.floor((SCREEN_WIDTH - faceWidth) / 2);
  const faceY = Math.floor(SCREEN_HEIGHT * 0.3);

  const time = now();
  if (time % 4000 < 200) {
    face = face.replace(/[^\s]/g, "－");
  }
  if (stateIndex === 2 && time % 1000 < 500) {
    faceX += Math.sin(time / 200) * (SCREEN_WIDTH * 0.1);
  }

  display.drawString(face, faceX, faceY);
  display.drawString(face, faceX + 1, faceY);

  const happyText = "Happy: " + pet.happiness + "%";
  const happyWidth = happyText.length * 12;
  const happyX = Math.floor((SCREEN_WIDTH - happyWidth) / 2);
  display.drawString(happyText, happyX, 10);

  const statusY = SCREEN_HEIGHT - 60;
  display.drawString("Hngr: " + pet.hunger + "%", 10, statusY);
  display.drawString("Clean: " + pet.cleanliness + "%", 10, statusY + textYSpacing);

  const fedHrs = Math.floor((time - pet.timeLastFed) / 3600000);
  const petHrs = Math.floor((time - pet.timeLastPet) / 3600000);
  display.drawString("Fed:" + fedHrs + "h  Pet:" + petHrs + "h", 10, SCREEN_HEIGHT - 30);
}

function showHeartAnimation() {
  const heartText = "<3-<3";
  var heartWidth = heartText.length * 12;
  var heartX = Math.floor((SCREEN_WIDTH - heartWidth) / 2);
  var heartY = Math.floor(SCREEN_HEIGHT * 0.5);

  // Use the current background display.color
  display.fill(currentBgColor);
  display.setTextColor(faceColor);
  display.setTextSize(1);

  // Draw the heart
  display.drawString(heartText, heartX, heartY);

  delay(1000);

  heartWidth = 7 * 12;
  heartX = Math.floor((SCREEN_WIDTH - heartWidth) / 2);
  heartY = Math.floor(SCREEN_HEIGHT * 0.5);
  display.fill(currentBgColor);
  display.setTextColor(faceColor);
  display.setTextSize(1);
  display.drawString(heartText, heartX, heartY);

  delay(1000);

  heartWidth = 3 * 12;
  heartX = Math.floor((SCREEN_WIDTH - heartWidth) / 2);
  heartY = Math.floor(SCREEN_HEIGHT * 0.5);
  display.fill(currentBgColor);
  display.setTextColor(display.color(255, 0, 0));
  display.setTextSize(1);
  display.drawString(heartText, heartX, heartY);

  delay(1000);

  // Restore the original background display.color
  display.fill(currentBgColor);
}

/**
 * CLASSE PET
 */


function Pet(name, type, hunger, cleanliness, happiness, timeLastFed, timeLastPet, timeLastCleaned) {
  this.name = name || "Gotchi";
  this.type = type || "cat";
  this.hunger = clamp(hunger, 0, 100, 0);
  this.cleanliness = clamp(cleanliness, 0, 100, 100);
  this.happiness = clamp(happiness, 0, 100, 50);
  
  const time = now();
  this.timeLastFed = Number(timeLastFed || time);
  this.timeLastPet = Number(timeLastPet || time);
  this.timeLastCleaned = Number(timeLastCleaned || time);
}

Pet.prototype = {
  feed: function() {
    this.hunger = clamp(this.hunger - 10, 0, 100, this.hunger);
    this.timeLastFed = now();
    this.happiness = clamp(this.happiness + 20, 0, 100, this.happiness);
    display.fill(currentBgColor);
    dialog.message(this.name + " has been fed!");
  },
  clean: function() {
    this.cleanliness = 100;
    this.timeLastCleaned = now();
    display.fill(currentBgColor);
    dialog.message(this.name + " is now clean!");
  },
  pet: function() {
    this.happiness = clamp(this.happiness + 10, 0, 100, this.happiness);
    this.timeLastPet = now();
    display.fill(currentBgColor);
    dialog.message(this.name + " loves your petting!");
  },
  updateHunger: function() {
    const elapsedMilisseconds = now() - this.timeLastFed;
    const accumulatedHunger = computeAccumulatedProgress(elapsedMilisseconds, 5);
    this.hunger = clamp(this.hunger + accumulatedHunger, 0, 100, this.hunger);
  },
  updateHappiness: function() {
    const elapsedMilisseconds = now() - this.timeLastPet;
    const accumulatedBoredom = computeAccumulatedProgress(elapsedMilisseconds, 5);
    this.happiness = clamp(this.happiness - accumulatedBoredom, 0, 100, this.happiness);
  },
  updateCleanliness: function() {
    const time = now();
    const elapsedMilisseconds = now() - this.timeLastCleaned;
    const accumulatedDirt = computeAccumulatedProgress(elapsedMilisseconds, 5);
    this.cleanliness = clamp(this.cleanliness - accumulatedDirt, 0, 100, this.cleanliness);
  },
  save: function() {
    const petData = {
      name: this.name,
      type: this.type,
      hunger: this.hunger,
      cleanliness: this.cleanliness,
      happiness: this.happiness,
      timeLastFed: this.timeLastFed,
      timeLastPet: this.timeLastPet,
      timeLastCleaned: this.timeLastCleaned
    };
    const jsonString = JSON.stringify(petData);
    storage.write(pathStorage, jsonString, "write");
  }
};

/**
 *  MAIN
 */

var pet = loadPet();

if (!pet) {
  pet = getNewPet();
  pet.save();
}

var updateTime = 0;
while (true) {
  if(now() - updateTime > 1000){
    pet.updateHunger();
    pet.updateHappiness();
    pet.updateCleanliness();
    drawPet(pet);
    updateTime = now();
  }

  if (keyboard.getNextPress()) {
    const choice = dialog.choice([
      ["Pet", "pet"],
      ["Feed", "feed"],
      ["Clean", "clean"],
      ["Heart", "heart"],
      ["Settings", "settings"],
      ["New Pet", "newpet"],
      ["Exit", "exit"]
    ]) || "";

    if (choice === "exit") {
      pet.save(); // Save before exiting
      break;
    }

    if (choice === "settings") {
      const setting = dialog.choice([
        ["Change BG Color", "bgcolor"],
        ["Face Color", "facecolor"],
        ["Back", "back"]
      ]);
      if (setting === "bgcolor") {
        const colorChoice = dialog.choice([
          "Peach",
          "Mint",
          "Pink",
          "Blue",
          "Yellow",
          "White",
          "Lavender",
          "Coral",
          "Aqua",
          "Beige"
        ]);
        if (colorChoice && pastelColors[colorChoice]) {
          currentBgColor = pastelColors[colorChoice];
        }
      }
      else if (setting === "facecolor") {
        const fc = dialog.choice([
          ["Black", "black"],
          ["White", "white"],
          ["Red", "red"],
          ["Blue", "blue"],
          ["Green", "green"],
          ["Purple", "purple"]
        ]);
        faceColor = faceColors[fc];
      }
    }
    else if (choice === "newpet") {
      const confirm = dialog.choice([
        ["Yes (will delete old pet)", "yes"],
        ["No (cancel)", "no"]
      ]);

      if (confirm === "yes") {
        storage.remove(pathStorage);
        pet = getNewPet();
        pet.save();
      }
    }
    else if (choice === "heart") {
      showHeartAnimation();
    }
    else if (choice && pet[choice]) {
      pet[choice]();
      delay(1000);
    }
    pet.save(); // Save after performing an action
  }

  delay(10);
}