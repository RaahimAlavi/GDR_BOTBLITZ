import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sound } from '../lib/soundFx';
export default function SoundToggle({className = ''}) {
  const [muted, setMuted] = useState(sound.isMuted());
  return <button type="button" className={'icon-button ' + className} onClick={() => {sound.init(); setMuted(sound.toggleMute());}} aria-label={muted ? 'Unmute audio' : 'Mute audio'} aria-pressed={muted}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>;
}
