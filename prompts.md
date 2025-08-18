I have a weird behaviour, when changing the map layer on /courts:

- when i click on "street" the map layer loads, but i have a diagonal row of squares that are grey. it looks like the map data cant load their. when i zoom in or zoom out, the location of these diagonal rows changes

Describe my written behaviour in your own words, so that i know you understood me correct


###

I have data for courts from my city. Its an array with these informations per court:

      "attributes": {
        "typ": "Spiel- und Sportangebot",
        "spielplatzname": "Spichernstraße/Stadtgarten",
        "stadtbezirk": "Innenstadt",
        "stadtteil": "Neustadt/Nord",
        "stadtviertel": "Stadtgarten-Viertel",
        "besonderheiten": null,
        "fussballtore": null,
        "torwand": null,
        "platzbelag_fussball": null,
        "basketballkoerbe": null,
        "boulebahn": null,
        "skaterelemente": null,
        "tischtennisplatten": "1",
        "bemerkung": "Badmintoncourt",
        "foto": null
      },
      "geometry": {
        "x": 6.935162540763991,
        "y": 50.943798240779344
      }

Analyze this data structure. Think about possible improvements for this data structure.
Remember that i have a map, where different courts are shown. I have cases where only one sport is available, but also courts with multiple sports. What are important things to consider? Also what do you recommend to handle the data in front end or backend?

