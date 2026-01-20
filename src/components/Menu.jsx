import { foods } from '../data/content';
import { getIcon } from '../utils/iconMapper';

const Menu = () => {

  return (
    <section id="menu" className="py-32 bg-[#0a0a0a] text-center border-y border-white/5 overflow-hidden">
      <h2 className="text-5xl font-serif text-gold mb-4 italic font-bold text-center">
        מה נאכל בסיור שלי?
      </h2>
      
      <div className="flex flex-row flex-nowrap overflow-x-auto gap-8 pb-12 px-8 custom-scroll scroll-smooth w-full text-center">
        {foods.map((food, i) => {
          const IconComponent = getIcon(food.icon);
          
          return (
            <article 
              key={i} 
              className="flex-shrink-0 w-80 md:w-96 bg-[#1E1E24] rounded-[4rem] p-12 border border-white/5 shadow-2xl flex flex-col items-center text-center"
            >
              <div className="text-gold mb-6 flex justify-center w-full text-center">
                <IconComponent size={48} />
              </div>
              <h4 className="text-3xl font-bold mb-4 font-serif text-gold text-center">
                {food.title}
              </h4>
              <p className="text-gray-400 leading-relaxed font-light text-center">
                {food.desc}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default Menu;
