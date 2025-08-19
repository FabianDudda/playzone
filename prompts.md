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

#####################################################################
#####################################################################
#####################################################################


# Icons für Map Pins

- welches Icon bei Plätzen mit mehreren Sportarten?

# Daten von Stadt Köln in DB einfügen

- wie richtig einfügen?
- Platzbelag nur für Fußball vorhanden
- andere "Unbekannt" oder null machen?

I have a json file with this format:

{
  "places": [
    {
      "attributes": {
        "name": "Rheinaustraße",
        "district": "Sürth",
        "fußballplätze": "1",
        "platzbelag_fußball": "Wiese",
        "basketballplätze": null,
        "boulebahn": null,
        "skatepark_elemente": null,
        "tischtennisplatten": "2"
      },
      "geometry": {
        "x": 7.012481767734089,
        "y": 50.863084651420266
      }
    },
     {
      "attributes": {
        "name": "Rheinaustraße",
        "district": "Sürth",
        "fußballplätze": "1",
        "platzbelag_fußball": "Wiese",
        "basketballplätze": null,
        "boulebahn": null,
        "skatepark_elemente": null,
        "tischtennisplatten": "2"
      },
      "geometry": {
        "x": 7.012481767734089,
        "y": 50.863084651420266
      }
    },
  ]
}

How can i add this json data to my supabase db.
- "name" should be the "name" of places
- "district" should be the "district" of places
- if "fußballplätze" != null, its the quantity in courts for sport "fußball"
- if "platzbelag_fußball" != null, its the "surface" of "fußball" court
- if "basketballplätze" != null, its the quantity in courts for sport "basketball"
- if "boulebahn" != null, its the quantity in courts for sport "boule"
- if "skatepark" != null, its the quantity in courts for sport "skatepark"



# Places editierbar machen

- User können Daten bearbeiten (zB bei courts: sport, anzahl, boden usw. //  bei places: adress, location usw.)
- User können Daten hinzufügen oder löschen
- Bevor Daten gespeichert werden, müssen diese von Admin überprüft werden


# Sub-page für jeden Place

- Meta Daten wie Name, Bilder, Adresse usw
- verfügbare Plätze