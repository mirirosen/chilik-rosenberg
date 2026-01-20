import profileImage from '../assets/hilik-profile.jpeg';

const Bio = () => {
  return (
    <section 
      id="about" 
      className="py-32 max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16 text-right"
    >
      <div className="w-full md:w-1/2 relative text-right">
        <img 
          src={profileImage} 
          alt="חיליק" 
          className="rounded-[3rem] w-full shadow-2xl border-2 border-gold/20" 
        />
      </div>
      
      <article className="w-full md:w-1/2 text-right">
        <h2 className="text-5xl font-serif text-gold mb-4 italic font-bold text-right">
          נעים להכיר, אני חיליק.
        </h2>
        <p className="text-xl text-gray-200 mb-6 leading-relaxed font-serif text-right">
          נוֹלַדְתִּי וַאֲנִי חַי אֶת כָּל חַיַּי בָּעִיר הָאֲהוּבָה עָלַי, בְּנֵי בְּרַק. לְמִשְׁפָּחָה לִיטָאִית שׁוֹרָשִׁית, לָמַדְתִּי בִּישִׁיבַת פּוֹנוֹבִיז'. אֲנִי אוֹהֵב אֶת הַחֲרֵדִיּוּת וְנֶהֱנֶה לְאָרֵחַ אֶתְכֶם בָּהּ – כַּמּוּבָן עִם כָּל הָאוֹכֶל הַיְּהוּדִי מְשַׂמֵּחַ הַלְּבָבוֹת.
        </p>
      </article>
    </section>
  );
};

export default Bio;
