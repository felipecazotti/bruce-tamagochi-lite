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
var currentBgColor = pastelColors["Peach"];

const faceColors = {
  "Black": display.color(0, 0, 0),
  "White": display.color(255, 255, 255),
  "Red": display.color(255, 0, 0),
  "Blue": display.color(0, 0, 255),
  "Green": display.color(0, 255, 0),
  "Purple": display.color(128, 0, 128)
};
var faceColor = faceColors["Black"]; // Default face display.color

function Pet(name, type, hunger, cleanliness, happiness, timeLastFed, timeLastPet, timeLastCleaned) {
  this.name = name || "gotchi"; // Changed default name to "gotchi"
  this.type = type || "cat";
  this.hunger = Math.min(100, Math.max(0, hunger !== undefined ? hunger : 0)); // Ensure hunger is between 0% and 100%
  this.cleanliness = Math.min(100, Math.max(0, cleanliness !== undefined ? cleanliness : 100)); // Ensure cleanliness is between 0% and 100%
  this.happiness = Math.min(100, Math.max(0, happiness !== undefined ? happiness : 50)); // Ensure happiness is between 0% and 100%
  const time = now();
  this.timeLastFed = timeLastFed || time;
  this.timeLastPet = timeLastPet || time;
  this.timeLastCleaned = timeLastCleaned || time; // Track cleaning time
}

Pet.prototype = {
  feed: function() {
    this.hunger = Math.max(0, this.hunger - 10); // Reduce hunger by 10%, but not below 0%
    this.timeLastFed = now();
    this.happiness = Math.min(100, this.happiness + 20); // Increase happiness by 20%, but not above 100%
    display.fill(currentBgColor);
    dialog.message(this.name + " has been fed!");
  },
  clean: function() {
    this.cleanliness = 100; // Fully clean
    this.timeLastCleaned = now();
    display.fill(currentBgColor);
    dialog.message(this.name + " is now clean!");
  },
  pet: function() {
    this.happiness = Math.min(100, this.happiness + 10); // Reduced happiness gain
    this.timeLastPet = now();
    display.fill(currentBgColor);
    dialog.message(this.name + " loves your petting!");
  },
  updateHunger: function() {
    const time = now();
    const elapsed = time - this.timeLastFed;
    this.hunger = Math.min(100, Math.max(0, this.hunger + Math.floor(elapsed / 7200000) * 10)); // Ensure hunger is between 0% and 100%
  },
  updateHappiness: function() {
    const time = now();
    const elapsed = time - this.timeLastPet;
    this.happiness = Math.max(0, this.happiness - Math.floor(elapsed / 3600000) * 5); // Ensure happiness is between 0% and 100%
  },
  updateCleanliness: function() {
    const time = now();
    const elapsed = time - this.timeLastCleaned;
    const hours = elapsed / 3600000;
    this.cleanliness = Math.max(0, 100 - Math.floor(hours * 5)); // Ensure cleanliness is between 0% and 100%
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
      timeLastCleaned: this.timeLastCleaned // Save cleaning time
    };
    const jsonString = JSON.stringify(petData);
    storage.write(pathStorage, jsonString, "write");
  }
};

function loadPet() {
  var data = null;
  try {
    data = storage.read(pathStorage);
  } catch (e1) {
    return null;
  }

  if (data) {
    try {
      const obj = JSON.parse(data);
      // Ensure timeLastFed and timeLastPet are numbers
      obj.timeLastFed = Number(obj.timeLastFed);
      obj.timeLastPet = Number(obj.timeLastPet);
      // Handle old saves without timeLastCleaned
      if (obj.timeLastCleaned === undefined) {
        const hoursAgo = (100 - obj.cleanliness) / 5;
        obj.timeLastCleaned = now() - hoursAgo * 3600000;
      } else {
        obj.timeLastCleaned = Number(obj.timeLastCleaned);
      }
      return new Pet(obj.name, obj.type, obj.hunger, obj.cleanliness,
                     obj.happiness, obj.timeLastFed, obj.timeLastPet, obj.timeLastCleaned);
    } catch (e2) {
      display.fill(currentBgColor);
      dialog.error("Failed to load pet data: " + e2.message);
      delay(10000);
      throw e2;
    }
  }
  return null; // No pet file found
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

var pet = loadPet();

if (!pet) {
  display.fill(currentBgColor);
  display.setTextColor(faceColor);
  display.setTextSize(2);
  const name = keyboard.keyboard("", 12, "Pet's name?") || "gotchi"; // Default to "gotchi"
  const type = dialog.choice([["Cat", "cat"], ["Dog", "dog"], ["Bird", "bird"]]) || "cat";
  pet = new Pet(name, type);
  pet.save();
}

var updateTime=0;
while (true) {
  if(now()-updateTime>500){
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
        //storage.remove("/JS-scripts/bruce_0.sub");
        storage.remove(pathStorage);
 
        // Create a new pet
        display.fill(currentBgColor);
        display.setTextColor(faceColor);
        display.setTextSize(2);
        const name = keyboard.keyboard("", 12, "Pet's name?") || "gotchi"; // Default to "gotchi"
        const type = dialog.choice([["Cat", "cat"], ["Dog", "dog"], ["Bird", "bird"]]) || "cat";
        pet = new Pet(name, type);
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
