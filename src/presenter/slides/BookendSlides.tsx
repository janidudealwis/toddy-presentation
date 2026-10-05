import { Leaf, Logo } from '../parts/Leaf';

/**
 * The slides either side of the categories. Optional (deck.bookends), on by default — they
 * give the presenter something to hold on screen while the room settles, and somewhere to
 * land at the end that is not a winner's face.
 */

export function IntroSlide({ eventName }: { eventName: string }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-10">
      <Logo width={620} className="[animation:fade-up_700ms_ease-out_both]" />

      {eventName.trim() && (
        <h1
          className="carved text-center leading-[1.1]"
          style={{ fontSize: 96, animation: 'fade-up 600ms ease-out 250ms both' }}
        >
          {eventName}
        </h1>
      )}

      <p
        className="font-sans text-cream-mute"
        style={{ fontSize: 26, fontWeight: 800, animation: 'hint-pulse 1800ms ease-in-out infinite' }}
      >
        Press <kbd className="font-display text-gold">→</kbd> to begin
      </p>
    </div>
  );
}

export function OutroSlide() {
  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-12">
      <Leaf className="absolute left-[16%] top-[18%] h-[180px] w-[270px] -rotate-[28deg] opacity-80" />
      <Leaf className="absolute right-[16%] top-[18%] h-[180px] w-[270px] rotate-[28deg] opacity-80" />

      <Logo width={420} className="[animation:fade-up_600ms_ease-out_both]" />

      <h1
        className="carved text-center leading-[1.1]"
        style={{ fontSize: 140, animation: 'fade-up 600ms ease-out 200ms both' }}
      >
        Thank you!
      </h1>
    </div>
  );
}
