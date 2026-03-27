function popcornHTML() {
  const prefs = getPreferences();
  if (prefs.popcorn_enabled != "true") {
    DocumentApp.getUi().alert('Popcorn is currently disabled. Enable it from Preferences to use this beta feature.');
    return;
  }
  let mainHTMLOutput = HtmlService.createHtmlOutputFromFile('popcorn').setTitle('Popcorn (beta)').setWidth(300);
  DocumentApp.getUi().showSidebar(mainHTMLOutput);
}

function insertPopcorn() {
  // hardcoded in consts file since we don't have that many tokens per day for querying the api, unfortunately
  
  let selectSource = (book, isShas) => {
    // currently only will give daf alef of shas, but that's fine for now because this is shtick anyways
    let ref = "", section = "", folio = "";
    if (isShas) {
      section = Math.floor(book["length"] * Math.random()) + 2;
      folio = ["a", "b"][Math.floor(Math.random() * 2)];
      ref = `${book["title"]}.${section}${folio}`;
    } else {
      section = Math.floor(book["length"] * Math.random());
      ref = `${book["title"]}.${section}`;
    }
    
    let data = findReference(ref);
    
    // ugly, but easier to fudge the title from scratch rather than get it dynamically and be forced to make yet ANOTHER req to the api

    let amtOfVerses = data.text.length;
    let randomVerseNumber = Math.floor(Math.random() * amtOfVerses);

    
    data.text = data.text[randomVerseNumber];
    //temporary fix
    data.he = data.he[randomVerseNumber++]

    data.heRef = `${data.heTitle} ${gematriya(section, {punctuate: false})}:${gematriya(randomVerseNumber, {punctuate: false})}`;
    //ugly fix
    data.ref = `${ref.replace(/\./g, " ")}:${randomVerseNumber}`;

    insertReference(data);

  };
  let i = 0;
  const AMT_OF_POPCORN = 5;
  while  (i < AMT_OF_POPCORN) {
    try {
      let typeOfBook = Math.floor(Math.random() * 2);
      let bookList = indexForPopcorn[typeOfBook];
      let bookIndex = Math.floor(bookList.length * Math.random());
      let book = bookList[bookIndex];

      const isShas = (typeOfBook == 0) ? false : true;
      
      selectSource(book, isShas);
      i++;
    } catch(e) {
      Logger.log(`Could not pop the following kernel because ${e.message}`);
    }

  }
}

// for now, popcorn utilizes the Tanach and the Talmud layers
// this index could have been a 2d array of tuples, but I wanted to leave it open to adding extra information for each book so I used objects. Tamid is a chimera, so I left it out for now.
const indexForPopcorn = [
  [{"title": "Bereishit", "length": 50},
  {"title": "Shemot", "length": 40},
  {"title": "Vaykira", "length": 27},
  {"title": "Bamidbar", "length": 36},
  {"title": "Devarim", "length": 34}],
  [{"title": "Berakhot", "length":  61}, 
  {"title": "Shabbat", "length": 154}, 
  {"title": "Eiruvin", "length": 102},
  {"title": "Pesachim", "length": 118},
  { "title": "Rosh Hashanah", "length": 32},
  { "title": "Yoma", "length": 85}, 
  { "title": "Sukkah", "length": 53}, 
  {"title": "Beitzah", "length":  37}, 
  { "title": "Taanit", "length": 28},
  { "title": "Megillah", "length": 29},
  { "title": "Moed Katan", "length": 26},
  { "title": "Chagigah", "length":  25},
  { "title": "Yevamot", "length": 119}, 
  { "title": "Ketuvot", "length":  109}, 
  { "title": "Nedarim", "length":  88},
  { "title": "Nazir", "length":  63},
  {"title": "Sotah", "length": 46},
  {"title":"Gittin", "length": 87},
  {"title": "Kiddushin", "length": 79}, 
  {"title": "Bava Kama", "length": 116}, 
  {"title": "Bava Metzia", "length": 116}, 
  {"title": "Bava Batra", "length": 173}, 
  {"title": "Sanhedrin", "length": 110}, 
  {"title": "Makkot", "length": 21}, 
  {"title":"Shevuot", "length": 46}, 
  {"title":"Avodah Zarah", "length": 73}, 
  {"title":"Horayot", "length": 11}, 
  {"title":"Zevachim", "length": 117}, 
  {"title":"Menachot", "length": 107}, 
  {"title":"Chullin", "length": 139}, 
  {"title":"Bechorot", "length": 58}, 
  {"title":"Arakhin", "length": 31}, 
  {"title":"Temurah", "length": 31}, 
  {"title":"Keritot", "length": 25}, 
  {"title":"Meilah", "length": 19}, 
  {"title":"Niddah", "length": 70}]
];