import React, { useState } from "react";

const gameData = {
  "rFactor2": {
    cars: [/* ... même contenu qu’avant ... */],
    tracks: [/* ... même contenu qu’avant ... */]
  },
  "Assetto Corsa Competizione": {
    cars: [
      "Aston Martin", "Audi R8 LMS Evo", "BMW M6 GT3", "Bentley Continental",
      "Ferrari 488 GT3 Evo", "Ferrari 488 GT3", "Honda NSX GT3 Evo",
      "Lamborghini Hura Evo", "Lamborghini Huracan", "Lexus GT3",
      "Mc Laren 720S GT3", "Mercedes AMG GT3 2020", "Mercedes AMG GT3",
      "Nissan GTR GT3", "Porsche 991 GT3 R", "Porsche II 991 GT3 R"
    ],
    tracks: [ "Zandvoort" ]
  }
};

const OptimizeSetup = () => {
  const [game, setGame] = useState("");
  const [car, setCar] = useState("");
  const [track, setTrack] = useState("");
  const [behavior, setBehavior] = useState("");
  const [brakeBehavior, setBrakeBehavior] = useState("");
  const [phase, setPhase] = useState("");
  const [weather, setWeather] = useState("");
  const [tempAir, setTempAir] = useState("");
  const [tempTrack, setTempTrack] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse("");

    const res = await fetch("https://fastlap-backend.onrender.com/api/optimize-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game, car, track, behavior, brakeBehavior, phase,
        weather, tempAir, tempTrack, sessionType, duration, notes
      }),
    });

    const data = await res.json();
    setResponse(data.reply);
    setLoading(false);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Optimiser mon setup</h2>
      <form onSubmit={handleSubmit}>

        {/* Choix du jeu */}
        <label>
          Jeu :
          <select value={game} onChange={e => { setGame(e.target.value); setCar(""); setTrack(""); }} required>
            <option value="">-- Choisissez un jeu --</option>
            {Object.keys(gameData).map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <br /><br />

        {/* Voiture */}
        <label>
          Voiture :
          <select value={car} onChange={e => setCar(e.target.value)} required disabled={!game}>
            <option value="">-- Choisissez une voiture --</option>
            {game && gameData[game].cars.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <br /><br />

        {/* Circuit */}
        <label>
          Circuit :
          <select value={track} onChange={e => setTrack(e.target.value)} required disabled={!game}>
            <option value="">-- Choisissez un circuit --</option>
            {game && gameData[game].tracks.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <br /><br />

        {/* Comportement du véhicule */}
        <label>
          Comportement souhaité du véhicule :
          <select value={behavior} onChange={e => setBehavior(e.target.value)}>
            <option value="">-- Choisissez --</option>
            <option value="survireur">Survireur</option>
            <option value="sous-vireur">Sous-vireur</option>
            <option value="neutre">Neutre</option>
          </select>
        </label>
        <br /><br />

        {/* Freinage */}
        <label>
          Comportement souhaité au freinage :
          <select value={brakeBehavior} onChange={e => setBrakeBehavior(e.target.value)}>
            <option value="">-- Choisissez --</option>
            <option value="survireur">Survireur</option>
            <option value="sous-vireur">Sous-vireur</option>
          </select>
        </label>
        <br /><br />

        {/* Phase du virage */}
        <label>
          Phase du virage concernée :
          <select value={phase} onChange={e => setPhase(e.target.value)}>
            <option value="">-- Choisissez --</option>
            <option value="entrée">Entrée</option>
            <option value="milieu">Milieu</option>
            <option value="sortie">Sortie</option>
          </select>
        </label>
        <br /><br />

        {/* Conditions météo */}
        <label>
          Conditions météo :
          <select value={weather} onChange={e => setWeather(e.target.value)} required>
            <option value="">-- Choisissez --</option>
            <option value="sec">Sec</option>
            <option value="pluie légère">Pluie légère</option>
            <option value="pluie forte">Pluie forte</option>
            <option value="nuageux">Nuageux</option>
          </select>
        </label>
        <br /><br />

        {/* Températures */}
        <label>
          Température de l’air (°C) :
          <input type="number" value={tempAir} onChange={e => setTempAir(e.target.value)} required />
        </label>
        <br /><br />
        <label>
          Température de la piste (°C) :
          <input type="number" value={tempTrack} onChange={e => setTempTrack(e.target.value)} />
        </label>
        <br /><br />

        {/* Type de session */}
        <label>
          Type de session :
          <select value={sessionType} onChange={e => setSessionType(e.target.value)} required>
            <option value="">-- Choisissez --</option>
            <option value="qualification">Qualification</option>
            <option value="course">Course</option>
          </select>
        </label>
        <br /><br />
        <label>
          Durée de la session (en minutes) :
          <input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
        </label>
        <br /><br />

        {/* Texte libre */}
        <label>
          Explications supplémentaires :
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Décrivez ici les difficultés rencontrées ou ce que vous attendez du setup..."
          />
        </label>
        <br /><br />

        <button type="submit">Envoyer</button>
      </form>

      {loading && (
        <div style={{ marginTop: "2rem", color: "#007bff", fontStyle: "italic" }}>
          <p>✅ Votre demande a bien été envoyée.</p>
          <p>Notre intelligence artificielle est en train de concevoir un setup sur mesure selon vos critères.</p>
          <p>⏳ Veuillez patienter quelques instants… Vous recevrez votre setup dès qu’il sera prêt.</p>
        </div>
      )}

      {response && (
        <div style={{ marginTop: "2rem" }}>
          <h3>Réponse IA :</h3>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
};

export default OptimizeSetup;
