import { FAQS } from "@/lib/content";
import { SectionHead } from "./SectionHead";
import { FAQItem } from "./FAQItem";

export function FAQ() {
  return (
    <section id="faq" className="py-20">
      <div className="container">
        <SectionHead eyebrow="F.A.Q." title="Frequently anxious questions." />
        <div className="max-w-[820px] mt-8">
          {FAQS.map((f, i) => (
            <FAQItem key={i} q={f.q} a={f.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
