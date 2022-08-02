import fs from "fs";
import axios from "axios";
import inquirer from "inquirer";
import http from "http";
import express from "express";

const screen = await inquirer
  .prompt({
    type: "rawlist",
    message: "Welcome here!\t Choose operation:\n",
    name: "choice",
    choices: ["Show coin list", "Start server"],
  })
  .then((answer) => {
    if (answer.choice === "Show coin list") {
      axios
        .get("https://api.coingecko.com/api/v3/coins/list")
        .then((response) => {
          const coinslist = response.data;
          fs.writeFile(
            "./cache/coins.json",
            JSON.stringify(coinslist),
            (err) => {
              if (err) throw err;
            }
          );
          const coinslistdisp = coinslist.splice(0, 30);
          const newinq = new inquirer.prompt({
            type: "rawlist",
            name: "List2",
            choices: coinslistdisp,
          }).then((answers) => {
            const val = answers[Object.keys(answers)[0]];

            const coinId = coinslistdisp.find((coin) => coin.name === val).id;
            axios
              .get(
                `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=max`
              )
              .then((resp) => {
                answers = resp.data;
                console.log(answers);

                const newinqur = new inquirer.prompt([
                  {
                    type: "confirm",
                    name: "wants",
                    message: "Do you want to save it in cache folder ?",
                    default: true,
                  },
                  {
                    type: "confirm",
                    name: "confirm_answer",
                    message: "Are you sure?",
                    when: (ans) => ans.wants === false,
                  },
                ]).then((ans) => {
                  if (ans.wants) {
                    const savedata = JSON.stringify(answers);
                    fs.writeFile(
                      `./cache/market-charts/${coinId}.json`,
                      JSON.stringify(answers),
                      (err) => {
                        if (err) throw err;
                      },
                      () => {
                        console.log("Process succeeded");
                      }
                    );
                  } else if (ans.confirm_answer) {
                    console.log("Please try again...");
                  }
                });
              })
              .catch((err) => {
                console.log(err);
              });
          });
        });
    } else if (answer.choice === "Start server") {
      const app = express();

      app.use(express.json());

      app.get("/", (req, res) => {
        fs.readFile("./cache/coins.json", (err, data) => {
          if (err) throw err;
          const coinsdata = JSON.parse(data.toString());
        
          res.send(coinsdata);
        });
      });

      app.get(`/:id`, (req, res) => {
        const filePath = `./cache/market-charts/${req.params.id}.json`;

        if (fs.existsSync(filePath)) {
          fs.readFile(filePath, (err, data) => {
            if (err) {
              res.status(500).send({
                message: err.message,
              });
              return;
            }
            let coinsdatas = JSON.parse(data.toString());
            console.log(coinsdatas);
            res.send(coinsdatas);
          });
        } else {
          axios
            .get(
              `https://api.coingecko.com/api/v3/coins/${req.params.id}/market_chart?vs_currency=usd&days=max`
            )
            .then((resp) => {
              const newdata = resp.data;
              fs.writeFile(filePath, JSON.stringify(newdata), (err) => {
                if (err) throw err;
              });

              res.send(newdata);
            });
        }
      });

      const server = http.createServer(app);

      server.listen(8080, () => {
        console.log("Server running at 8080 port...");
      });
    }
  });
