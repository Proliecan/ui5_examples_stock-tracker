sap.ui.define(['sap/ui/core/mvc/Controller',
    'sap/ui/model/json/JSONModel',
    'sap/m/Dialog',
    'sap/m/library',
    'sap/m/Button',
    'sap/m/Label',
    'sap/m/Input',
    'sap/ui/core/Core',
    'sap/m/MessageToast'],
    function (Controller, JSONModel, Dialog, library, Button, Label, Input, Core, MessageToast) {
        "use strict";

        var PageController = Controller.extend("stock-tracker.controller.App", {

            onInit: function () {
                let oModel = new JSONModel();
                oModel.loadData("model/stocks.json", null, false);
                this.getView().setModel(oModel);
                this.onSync();
            },

            onAdd: function () {
                if (!this.oAddDialog) {
                    this.oAddDialog = new Dialog({
                        type: library.DialogType.Message,
                        title: "Add new Tracker",
                        content: [
                            new Label({
                                text: "Which stock do you want to monitor?",
                                labelFor: "symbol"
                            }),
                            new Input("symbol", {
                                width: "100%",
                                placeholder: "Ticker Symbol",
                                value: "",
                                submit: function () {
                                    let symbol = Core.byId("symbol").getValue();
                                    this.addSymbol(symbol);
                                    this.oAddDialog.close();
                                }.bind(this)
                            })
                        ],
                        beginButton: new Button({
                            type: library.ButtonType.Emphasized,
                            text: "Submit",
                            press: function () {
                                let symbol = Core.byId("symbol").getValue();
                                this.addSymbol(symbol);
                                this.oAddDialog.close();
                            }.bind(this)
                        }),
                        endButton: new Button({
                            text: "Cancel",
                            press: function () {
                                this.oAddDialog.close();
                            }.bind(this)
                        })
                    })
                }

                this.oAddDialog.open();
            },
            onEdit: function () {
                let oModel = this.getView().getModel();;

                if (oModel.oData.bin.settings.scope == "Display")
                    oModel.setProperty("/bin/settings/scope", "ActionRemove");
                else
                    oModel.setProperty("/bin/settings/scope", "Display");
            },
            onSync: function () {
                let oData = this.getView().getModel().oData;
                let oSymbols = oData.symbols;
                let finnhub_base_url = oData.config.api.finnhub_base_url;
                let oToken = new JSONModel();
                oToken.loadData("model/api-tokens.json", null, false);
                oToken = oToken.oData.finnhub;

                let tiles = [];

                oSymbols.forEach(symbol => {
                    let quote_url = finnhub_base_url + "quote?symbol=" + symbol + "&token=" + oToken;
                    let profile_url = finnhub_base_url + "stock/profile2?symbol=" + symbol + "&token=" + oToken;
                    $.getJSON(quote_url).done((quote) => {
                        // This is not very efficient (one could save already known profiles)
                        $.getJSON(profile_url).done((profile) => {
                            let tile = new Object();
                            tile.symbol = symbol;
                            tile.name = profile.name;
                            tile.currency = profile.currency;
                            tile.current = quote.c;
                            tile.percent_change = quote.dp.toFixed(oData.bin.settings.detail_level.change_decimals) + "%";
                            tile.icon = profile.logo;
                            if (oData.bin.settings.detailed)
                                tile.time = new Date(quote.t * 1000).toLocaleString(navigator.language)
                            else
                                tile.time = new Date(quote.t * 1000).toLocaleTimeString(navigator.language)
                            if (quote.dp > 0) {
                                tile.indicator = oData.config.indicators.positive;
                                tile.color = oData.config.colors.positive;
                            } else if (quote.dp < 0) {
                                tile.indicator = oData.config.indicators.negative;
                                tile.color = oData.config.colors.negative;
                            } else {
                                tile.indicator = oData.config.indicators.neutral;
                            }
                            if (quote.dp < .2 && quote.dp > -.2)
                                tile.color = oData.config.colors.neutral;

                            tiles.push(tile);

                            tiles.sort((a, b) => a.symbol.localeCompare(b.symbol))
                            this.getView().getModel().setProperty("/bin/tiles", tiles);
                        }).fail(() => {
                            MessageToast.show("Finnhub API quota Limit reached!")
                            return;
                        })
                    }).fail(() => {
                        MessageToast.show("Finnhub API quota Limit reached!")
                        return;
                    });
                });
            },

            onTile: function (evt) {
                let oTile = evt.getSource();
                let oHeader = oTile.getHeader();    //Header is Symbol

                if (evt.getParameter("action") === "Remove") {
                    this.removeSymbol(oHeader);
                } else {
                    let baseURL = this.getView().getModel().oData.config.api.marketwatch_base_url;
                    window.open(baseURL + oHeader, "_blank");
                }
            },

            addSymbol: function (symbol) {
                let oData = this.getView().getModel().oData;

                if (!symbol) {
                    MessageToast.show('There is no such symbol: "' + symbol + '"!');
                    return;
                }

                if (oData.symbols.indexOf(symbol) >= 0) {
                    MessageToast.show("There is already a card for " + symbol + "!");
                    return;
                } else {
                    oData.symbols.push(symbol);
                }

                this.onSync();
            },
            removeSymbol: function (symbol) {
                let oData = this.getView().getModel().oData;

                var index = oData.symbols.indexOf(symbol);
                if (index > -1) {
                    oData.symbols.splice(index, 1);
                }

                this.onSync();
            },

            onDetailLevelChange: function (evt) {
                let state = evt.getParameters().state;
                let oData = this.getView().getModel().oData;

                oData.bin.settings.detailed = state;
                if (state) {
                    oData.bin.settings.detail_level = oData.config.detail_levels.detailed;
                } else {
                    oData.bin.settings.detail_level = oData.config.detail_levels.normal;
                }

                this.onSync();
            },

            onGithub: function () {
                let url = this.getView().getModel().oData.config.api.github_url;
                window.open(url, "_blank");
            },
            onBack: function() {
                history.back();
            }
        });

        return PageController;

    });