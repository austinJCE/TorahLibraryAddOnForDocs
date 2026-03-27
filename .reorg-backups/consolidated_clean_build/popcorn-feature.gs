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
