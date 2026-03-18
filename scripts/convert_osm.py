#!/usr/bin/env python3
"""
Convert OSM GeoJSON files to import-places JSON format.
Usage: python3 scripts/convert_osm.py
"""

import json
import sys
from pathlib import Path

# Sports to skip entirely (place + sport)
SKIP_SPORTS = {'bmx', 'cycling', 'disc_golf', 'table_soccer', 'rugby', 'multi'}

# OSM sport tag → import field name
SPORT_MAP = {
    'climbing':           'klettern',
    'climbing_adventure': 'klettern',
    'basketball':         'basketballplätze',
    'table_tennis':       'tischtennisplatten',
    'soccer':             'fußballplätze',
    'tennis':             'tennisplätze',
    'skateboard':         'skatepark',
    'roller_skating':     'skatepark',
    'beachvolleyball':    'beachvolleyballplätze',
    'boules':             'bouleplätze',
    'fitness':            'calisthenics',
    'athletics':          'laufbahnen',
    'swimming':           'schwimmplätze',
    'chess':              'schachfelder',
    'padel':              'padelplätze',
    'badminton':          'badmintonplätze',
}

# Human-readable German labels for name fallback
SPORT_LABELS = {
    'klettern':               'Kletteranlage',
    'basketballplätze':       'Basketballplatz',
    'tischtennisplatten':     'Tischtennisplatte',
    'fußballplätze':          'Fußballplatz',
    'tennisplätze':           'Tennisplatz',
    'skatepark':              'Skatepark',
    'beachvolleyballplätze':  'Beachvolleyballfeld',
    'bouleplätze':            'Boulebahn',
    'calisthenics':           'Fitnessanlage',
    'laufbahnen':             'Laufbahn',
    'schwimmplätze':          'Schwimmbad',
    'schachfelder':           'Schachfeld',
    'padelplätze':            'Padelplatz',
    'badmintonplätze':        'Badmintonplatz',
}


def centroid(geometry):
    """Return (lon, lat) centroid for Point, Polygon, or LineString."""
    gtype = geometry['type']
    coords = geometry['coordinates']

    if gtype == 'Point':
        return coords[0], coords[1]

    if gtype == 'LineString':
        pts = coords
    elif gtype == 'Polygon':
        pts = coords[0]  # outer ring only
    elif gtype == 'MultiPolygon':
        # flatten outer rings of all polygons
        pts = [pt for poly in coords for pt in poly[0]]
    else:
        raise ValueError(f'Unsupported geometry type: {gtype}')

    lon = sum(p[0] for p in pts) / len(pts)
    lat = sum(p[1] for p in pts) / len(pts)
    return lon, lat


def resolve_name(props, sport_fields):
    """Determine the best available name using fallback chain."""
    # 1. Explicit name fields
    for key in ('name', 'loc_name', 'alt_name', 'official_name'):
        if props.get(key):
            return props[key]

    # 2. Street address
    street = props.get('addr:street')
    number = props.get('addr:housenumber')
    if street and number:
        return f'{street} {number}'
    if street:
        return street

    # 3. Operator
    if props.get('operator'):
        return props['operator']

    # 4. Sport label (use first mapped sport)
    for field in sport_fields:
        if field in SPORT_LABELS:
            return SPORT_LABELS[field]

    # 5. Leisure label
    leisure = props.get('leisure', '')
    if 'swimming' in leisure:
        return 'Schwimmbad'
    if leisure:
        return leisure.replace('_', ' ').title()

    return None


def convert_feature(feat):
    """
    Convert a GeoJSON feature to a JsonPlace dict.
    Returns None if the feature should be skipped.
    """
    props = feat.get('properties', {})
    geometry = feat.get('geometry')

    if not geometry:
        return None

    # Parse and split sport tags
    sport_raw = props.get('sport', '')
    sports = [s.strip() for s in sport_raw.split(';') if s.strip()]

    # Check if all sports are in the skip list → skip entirely
    if sports and all(s in SKIP_SPORTS for s in sports):
        return None

    # Build sport fields from mappable sports
    sport_fields = set()
    for s in sports:
        if s in SKIP_SPORTS:
            continue
        if s in SPORT_MAP:
            sport_fields.add(SPORT_MAP[s])

    # Fallback: leisure=swimming_area with no sport tag
    if not sport_fields and props.get('leisure') == 'swimming_area':
        sport_fields.add('schwimmplätze')

    # No mappable sport at all → skip
    if not sport_fields:
        return None

    # Resolve name
    name = resolve_name(props, sport_fields)
    if not name:
        return None

    # Calculate centroid
    try:
        lon, lat = centroid(geometry)
    except Exception as e:
        print(f'  Warning: centroid error for {name}: {e}', file=sys.stderr)
        return None

    place = {
        'name': name,
        'place_type': 'öffentlich',
        'geometry': {'x': round(lon, 7), 'y': round(lat, 7)},
    }

    for field in sport_fields:
        place[field] = 1

    return place


def convert_file(input_path, output_path):
    with open(input_path, encoding='utf-8') as f:
        data = json.load(f)

    features = data.get('features', [])
    places = []
    skipped = 0

    for feat in features:
        result = convert_feature(feat)
        if result:
            places.append(result)
        else:
            skipped += 1

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(places, f, ensure_ascii=False, indent=2)

    print(f'{input_path.name} → {output_path.name}: {len(places)} places, {skipped} skipped')
    return places


if __name__ == '__main__':
    script_dir = Path(__file__).parent

    files = [
        ('osm_data_oesterreich.geojson', 'osm_oesterreich.json'),
        ('osm_data_schweiz.geojson',     'osm_schweiz.json'),
    ]

    for src, dst in files:
        convert_file(script_dir / src, script_dir / dst)
