import { sanitizeNickname } from './profanityFilter.js';
import { getScoreTarget } from './scoreOutbox.js';

export const nameKey = name => name.trim().replace(/\s+/g, ' ').toLowerCase();
const profileKey = target => 'botblitz_names_v1:' + encodeURIComponent(target);
export function readNameProfiles(storage, target = getScoreTarget()) {
  try {const profiles = JSON.parse((storage || localStorage).getItem(profileKey(target)) || '{}'); return profiles && typeof profiles === 'object' && !Array.isArray(profiles) ? profiles : {};} catch {return {};}
}
export function rememberName(profile, storage = localStorage, target = getScoreTarget()) {
  const profiles = readNameProfiles(storage, target);
  profiles['name:' + nameKey(profile.nickname)] = profile;
  try {storage.setItem(profileKey(target), JSON.stringify(profiles));}
  catch {throw new Error('Your browser cannot remember your player name. Enable site storage and try again.');}
  return profile;
}
export function getNameProfile(name, storage, target = getScoreTarget()) {
  return readNameProfiles(storage, target)['name:' + nameKey(name)] || null;
}
export function isGeneratedName(name) {
  return /^(CYBER|NEON|ROBO|TURBO|QUANTUM|BLITZ|AERO|NEXUS|TITAN|VOLT|PHANTOM|ZERO)_(BOT|VIPER|PILOT|CORE|SPARK|DRONE|RUNNER|BYTE|RIDER|CHIP|FORCE|GEAR)\d{1,3}$/.test(name);
}
export function initialPlayerName(storage) {
  try {const name = (storage || localStorage).getItem('botblitz_player_name') || ''; return isGeneratedName(name) ? '' : name;} catch {return '';}
}

// The service checks/reserves names online; only remembered names can start offline.
export async function preparePlayerName(rawName, {storage = localStorage, target = getScoreTarget(),
  connected = navigator.onLine !== false, claim, legacyName = initialPlayerName(storage)} = {}) {
  const validation = sanitizeNickname(rawName);
  if (!validation.isValid) throw new Error(validation.error);
  const nickname = validation.sanitizedName;
  const previous = getNameProfile(nickname, storage, target);
  if (!connected) {
    if (previous?.confirmed) return previous;
    throw new Error('Connect to the internet once to check your new name. You can then replay offline.');
  }
  const token = previous?.token || crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  // Persist the token before claiming: a lost response must not lock this device out.
  const candidate = {nickname, token, confirmed:false};
  if (!previous) {
    const profiles = readNameProfiles(storage, target);
    profiles['name:' + nameKey(nickname)] = candidate;
    try {storage.setItem(profileKey(target), JSON.stringify(profiles));}
    catch {throw new Error('Your browser cannot remember your player name. Enable site storage and try again.');}
  }
  const result = await claim({nickname, token, previous, legacyOwner:nameKey(legacyName) === nameKey(nickname)});
  if (!result.available) throw new Error('That name is already taken. Add your initials or choose another name.');
  return rememberName({nickname:result.nickname || nickname, token, confirmed:true,
    reserved:Boolean(result.reserved)}, storage, target);
}
