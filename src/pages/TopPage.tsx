import { useAppState } from "../store/store-context";
import { StoreImage } from "../components/StoreImage";
import { StockBarChart } from "../components/StockBarChart";
import { cn } from "../lib/utils";

function menuIcon(name: string): { src: string; fallbackEmoji: string } {
  if (name.includes("ガーリック"))
    return { src: "/images/momo_salt.jpg", fallbackEmoji: "🧄" };
  if (name.includes("もも"))
    return { src: "/images/momo_sauce.jpg", fallbackEmoji: "🍗" };
  if (name.includes("かわ"))
    return { src: "/images/kawa_sauce.jpg", fallbackEmoji: "🔥" };
  return { src: "/images/momo_sauce.jpg", fallbackEmoji: "🍢" };
}

export default function TopPage() {
  const state = useAppState();

  return (
    <div className="min-h-dvh overflow-x-hidden bg-paper">
      <div className="sticky top-0 z-40 bg-ink/90 px-4 py-2 text-center backdrop-blur">
        <span className="font-display text-sm text-mustard">
          責任トリません
        </span>
      </div>

      {/* ヒーロー */}
      <section className="relative min-h-[92dvh] overflow-hidden">
        <StoreImage
          src="/images/hero_image.jpg"
          alt="責任トリません 屋台の外観"
          className="absolute inset-0 h-full w-full object-cover"
          fallbackEmoji="🏮"
          fallbackLabel="hero_image.jpg"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-ink/40" />

        <div className="relative flex min-h-[92dvh] flex-col justify-between px-5 py-6 md:px-10 md:py-10">
          <div className="flex items-start justify-between">
            <span className="rounded-full bg-black/40 px-4 py-1 text-xs font-bold tracking-wide text-white/90 backdrop-blur">
              高校3年1組
            </span>
            <span className="rounded-full bg-hanten px-4 py-2 text-sm font-black text-white shadow-lg">
              ただいま {state.status.waiting_count}人待ち
            </span>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="relative -rotate-1 rounded-sm bg-mustard px-6 py-8 shadow-2xl md:px-10 md:py-10">
              <p className="text-center text-xs font-bold text-ink/70 md:text-sm">
                食べたあとのことは...
              </p>
              <h1 className="mt-2 text-center font-display text-5xl leading-none text-ink md:text-6xl">
                責任
              </h1>
              <h1 className="mt-2 text-center font-display text-5xl leading-none text-ink md:text-6xl">
                トリません
              </h1>
              <div className="mt-5 rotate-1 bg-hanten px-4 py-2 text-center shadow-md">
                <p className="font-display text-lg text-white md:text-2xl">
                  焼き鳥、自己責任でどうぞ。
                </p>
              </div>
            </div>

            <StoreImage
              src="/images/mascot_1.png"
              alt="鳥マスコット"
              className="absolute -bottom-6 -right-4 h-24 w-24 rotate-6 object-contain drop-shadow-xl md:h-32 md:w-32"
              fallbackEmoji="🐔"
              fallbackLabel="mascot_1.png"
            />
          </div>

          <a
            href="#menu"
            className="mx-auto flex flex-col items-center gap-1 rounded-sm text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            <span className="text-xs font-bold">メニューを見る</span>
            <span className="text-xl">↓</span>
          </a>
        </div>
      </section>

      {/* 紹介 */}
      <section className="bg-paper px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="font-display text-3xl text-ink md:text-4xl">
              美味しさに、言い訳はいらない。
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-8 text-ink/80">
              炭火でサッと炙った鳥もも、パリッと焼き上げたかわ。ひとくち食べたら最後、箸は止まりません。
              食べ過ぎても、惚れすぎても——
              <span className="font-bold text-hanten">
                責任は、トリません。
              </span>
            </p>
          </div>
          <StoreImage
            src="/images/mascot_2.png"
            alt="鳥マスコット"
            className="mx-auto h-40 w-40 object-contain md:h-56 md:w-56"
            fallbackEmoji="🐓"
            fallbackLabel="mascot_2.png"
          />
        </div>
      </section>

      {/* メニュー */}
      <section id="menu" className="bg-mustard px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-bold text-ink/70">
              全品 炭火でサッと炙り上げます
            </p>
            <h2 className="mt-2 font-display text-4xl text-ink md:text-5xl">
              メニュー
            </h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {state.menuItems.map((menu, i) => {
              const stock = state.stockItems.find(
                (s) => s.id === menu.stock_item_id,
              );
              const icon = menuIcon(menu.name);
              const soldOut = (stock?.current_stock ?? 0) <= 0;
              const low = !soldOut && (stock?.current_stock ?? 0) <= 10;
              return (
                <div
                  key={menu.id}
                  className={cn(
                    "relative rounded-sm bg-paper p-6 text-center shadow-lg",
                    i % 2 === 0 ? "-rotate-1" : "rotate-1",
                    soldOut && "opacity-60",
                  )}
                >
                  {soldOut && (
                    <span className="absolute right-3 top-3 -rotate-12 rounded-sm border-2 border-hanten px-2 py-0.5 text-xs font-black text-hanten">
                      完売
                    </span>
                  )}
                  <StoreImage
                    src={icon.src}
                    alt={menu.name}
                    className="mx-auto h-20 w-20 object-contain"
                    fallbackEmoji={icon.fallbackEmoji}
                  />
                  <p className="mt-4 font-display text-xl text-ink">
                    {menu.name}
                  </p>
                  <p className="mt-1 text-2xl font-black text-ink">
                    ¥{menu.price}
                  </p>
                  {low && (
                    <p className="mt-2 text-xs font-bold text-hanten">
                      残りわずか
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-center text-sm font-bold text-ink/70">
            お会計は紙の食券にて承ります
          </p>
        </div>
      </section>

      {/* 在庫（サイネージ埋め込み） */}
      <section id="stock" className="bg-ink px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold text-mustard">リアルタイム在庫</p>
          <h2 className="mt-2 font-display text-3xl text-white md:text-4xl">
            焼ける端から、売れていきます。
          </h2>
          <div className="mt-10 rounded-lg border border-wood/60 bg-black/30 p-8 md:p-10">
            <StockBarChart stockItems={state.stockItems} />
          </div>

          <a
            href="/signage"
            className="mt-6 inline-block rounded-sm text-sm font-bold text-mustard underline decoration-mustard/50 underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mustard focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            サイネージ画面をフルスクリーンで見る
          </a>
        </div>
      </section>

      {/* ギャラリー */}
      <section id="gallery" className="bg-paper px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            屋台のようす
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              { src: "/images/gallery1.png", rotate: "-rotate-2" },
              { src: "/images/gallery2.png", rotate: "rotate-1" },
              { src: "/images/gallery3.png", rotate: "-rotate-1" },
            ].map((photo, i) => (
              <div
                key={photo.src}
                className={cn("bg-white p-3 pb-8 shadow-xl", photo.rotate)}
              >
                <StoreImage
                  src={photo.src}
                  alt={`屋台の様子 ${i + 1}`}
                  className="aspect-[4/5] w-full object-cover"
                  fallbackEmoji="📷"
                  fallbackLabel={`gallery${i + 1}.png`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-ink px-5 py-12 text-center">
        <p className="font-display text-2xl text-mustard">
          食べたあとのことは、知りません。
        </p>
        <p className="mt-3 text-sm text-white/60">
          文化祭限定出店・責任トリません
        </p>
      </footer>
    </div>
  );
}
