import { Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Height shared between PersistentListSheet and EventBottomSheet
export const SHEET_HEIGHT = SCREEN_HEIGHT * 0.45;

// Approximate top nav + safe area height
const TOP_NAV_HEIGHT = 80;

// Fraction of the map view covered by the sheet
const MAP_HEIGHT = SCREEN_HEIGHT - TOP_NAV_HEIGHT;
export const SHEET_FRACTION = SHEET_HEIGHT / MAP_HEIGHT;
