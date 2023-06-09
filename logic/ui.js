"use strict";

/**
 * Chess user interface implementation. A chessboard is created as a html table.
 * Chess pieces are created as html divs, and placed as children of the chessboard tds.
 * Dragging and dropping is implemented with jQuery UI's draggable.
 * @constructor
 */
Chess.UI = function() {
	/** @type {!Chess.Position} */
	this.chessPosition = new Chess.Position;
};

/**
 * @const
 * @type {string}
 */
Chess.UI.CHESSBOARD_ID = "#chessboard";

/**
 * @const
 * @type {string}
 */
Chess.UI.CHESSBOARD_TABLE = Chess.UI.CHESSBOARD_ID + " table";

/**
 * @const
 * @type {string}
 */
Chess.UI.CHESSBOARD_SQUARE = Chess.UI.CHESSBOARD_ID + " table tr td";

/**
 * @const
 * @type {string}
 */
Chess.UI.CHESSBOARD_PIECE = Chess.UI.CHESSBOARD_SQUARE + " div";

/**
 * @const
 * @type {string}
 */
Chess.UI.CHESSBOARD_PIECES_AND_SQUARES = Chess.UI.CHESSBOARD_SQUARE + ", " + Chess.UI.CHESSBOARD_PIECE;

/** 
 * Creates a new chessboard table under an element with id="chessboard"
 */
Chess.UI.makeBoard = function() {
	var table = $("<table>");
	var filesRow = '<tr><th></th>' + "abcdefgh".split("").map(/** @param {string} x @return {string} */ function(x) { return '<th class="file">' + x + "</th>"; }).join("") + "<th></th></tr>";
	table.append(filesRow);

	for (var row = 0; row < Chess.RANKS; ++row) {
		var rank = Chess.LAST_RANK - row;
		var tr = $("<tr>");
		table.append(tr);

		var rankCell = '<th class="rank">' + (Chess.RANKS - row) + "</th>";
		tr.append(rankCell);

		for (var file = 0; file < Chess.FILES; ++file) {
			var td = $("<td>");
			var color = Chess.isLight(rank, file) ? "light" : "dark";
			td.attr("id", Chess.getAlgebraic(rank, file));
			td.attr("title",
				"Algebraic: " + Chess.getAlgebraic(rank, file) +
				"\nRank: " + rank +
				"\nFile: " + file +
				"\nIndex: " + Chess.getIndex(rank, file) +
				"\nColor: " + color);
			td.addClass(color);
			tr.append(td);
		}

		tr.append(rankCell);
	}

	table.append(filesRow);
	$(Chess.UI.CHESSBOARD_ID).append(table);
};

/**
 * Clears move related classes from chessboard table cells
 */
Chess.UI.clearMoving = function() {
	$(Chess.UI.CHESSBOARD_PIECES_AND_SQUARES).removeClass("from to positional capture double-push en-passant promotion castle king-castle queen-castle");
};

/**
 * Removes dragging and dropping capabilities from chessboard table cells
 */
Chess.UI.clearDragging = function() {
	$(Chess.UI.CHESSBOARD_PIECE + ".ui-draggable").draggable("destroy");
	$(Chess.UI.CHESSBOARD_SQUARE + ".ui-droppable").droppable("destroy");
};

/** Adds chess pieces to the chessboard
 */
Chess.UI.prototype.updatePieces = function() {
	$(Chess.UI.CHESSBOARD_PIECE).remove();
	$(Chess.UI.CHESSBOARD_SQUARE).removeClass("white black turn last-move " + Chess.PIECE_NAMES.join(" "));

	var whites = this.chessPosition.getColorBitboard(Chess.PieceColor.WHITE);
	var blacks = this.chessPosition.getColorBitboard(Chess.PieceColor.BLACK);

	for (var index = 0; index < Chess.RANKS * Chess.FILES; ++index) {
		var td = $("#" + Chess.getAlgebraicFromIndex(index));

		for (var piece = Chess.Piece.PAWN; piece <= Chess.Piece.KING; ++piece) {
			if (this.chessPosition.getPieceBitboard(piece).isSet(index)) {
				var isTurn = (this.chessPosition.getTurnColor() === Chess.PieceColor.WHITE) ? whites.isSet(index) : blacks.isSet(index);

				var div = $("<div>");
				div.attr("title", td.attr("title") + "\nPiece: " + Chess.PIECE_NAMES[piece] + "\nColor: " + (whites.isSet(index) ? "white" : "black"));
				div.text(Chess.getPieceCharacter(piece, whites.isSet(index) ? Chess.PieceColor.WHITE : Chess.PieceColor.BLACK));

				var elements = div.add(td);
				elements.addClass(Chess.PIECE_NAMES[piece]);
				elements.toggleClass("white", whites.isSet(index));
				elements.toggleClass("black", blacks.isSet(index));
				elements.toggleClass("turn", isTurn);

				td.append(div);

				break;
			}
		}
	}

	var lastMove = this.chessPosition.getLastMove();
	if (lastMove !== null) {
		$("#" + Chess.getAlgebraicFromIndex(lastMove.getFrom())).addClass("last-move");
		$("#" + Chess.getAlgebraicFromIndex(lastMove.getTo())).addClass("last-move");
	}
};

/**
 * Adds chessboard cell hover, and chess piece dragging and dropping capabilities to the chessboard
 */
Chess.UI.prototype.updateMoves = function() {
	var moves = this.chessPosition.getMoves();

	$(Chess.UI.CHESSBOARD_PIECES_AND_SQUARES).removeClass("can-move");
	moves.forEach(/** @param {!Chess.Move} move */ function(move) {
		var td = $("#" + Chess.getAlgebraicFromIndex(move.getFrom()));
		var elements = td.add(td.children());
		elements.addClass("can-move");
	});

	/** @type {boolean} */
	var dragging = false;
	var ui = this;

	$(Chess.UI.CHESSBOARD_PIECE + ".can-move").mouseenter(/** @this {!Element} */ function(event) {
		if (dragging) {
			return;
		}

		var div = $(this);
		var td = div.parent();
		var from = Chess.getIndexFromAlgebraic("" + td.attr("id"));
		var fromElements = td.add(div);
		fromElements.toggleClass("from", moves.some(/** @param {!Chess.Move} move @return {boolean} */ function(move) { return move.getFrom() === from; }));

		if (fromElements.hasClass("from")) {
			moves.forEach(/** @param {!Chess.Move} move */ function(move) {
				if (move.getFrom() === from) {
					var toElements = $("#" + Chess.getAlgebraicFromIndex(move.getTo()));
					toElements = toElements.add(toElements.children());
					toElements.addClass("to");
					toElements.addClass(move.getKind() === Chess.Move.Kind.POSITIONAL ? "positional" : "");
					toElements.addClass(move.isCapture() ? "capture" : "");
					toElements.addClass(move.getKind() === Chess.Move.Kind.DOUBLE_PAWN_PUSH ? "double-push" : "");
					toElements.addClass(move.getKind() === Chess.Move.Kind.EN_PASSANT_CAPTURE ? "en-passant" : "");
					toElements.addClass(move.isPromotion() ? "promotion" : "");
					toElements.addClass(move.isCastle() ? "castle" : "");
					toElements.addClass(move.getKind() === Chess.Move.Kind.KING_CASTLE ? "king-castle" : "");
					toElements.addClass(move.getKind() === Chess.Move.Kind.QUEEN_CASTLE ? "queen-castle" : "");
				}
			});

			Chess.UI.clearDragging();

			// Quote "drop", "start", "stop", etc to prevent the closure compiler from removing them
			$(Chess.UI.CHESSBOARD_SQUARE + ".to").droppable({
				"drop": /** @this {!Element} */ function() {
					var to = Chess.getIndexFromAlgebraic("" + $(this).attr("id"));
					var makeMoves = moves.filter(/** @param {!Chess.Move} move */ function(move) { return move.getFrom() === from && move.getTo() === to; });

					if (makeMoves.length > 0) {
						// TODO: it's possible that there is more than one move (promotions). Either ask the user here or have a droplist somewhere ("promote to")
						ui.chessPosition.makeMove(makeMoves[0]);
						ui.updateChessPosition();
					} else {
						// Dropped to an invalid square
						Chess.UI.clearMoving();
						Chess.UI.clearDragging();
					}
				}
			});

			div.draggable({
				"start": function() { dragging = true; },
				"stop": function() { dragging = false; },
				"containment": Chess.UI.CHESSBOARD_TABLE,
				"zIndex": 10,
				"revert": "invalid"
			});
		}
	}).mouseleave(function() {
		if (!dragging) {
			Chess.UI.clearMoving();
		}
	});

};

/**
 * Updates the chessboard according to the current chess position
 */
Chess.UI.prototype.updateChessPosition = function() {
	Chess.UI.clearMoving();
	Chess.UI.clearDragging();
	this.updatePieces();

	var status = this.chessPosition.getStatus();
	this.updateMoves();
	$("#dim").css({"display": "none"});

	if (status === Chess.Position.Status.CHECKMATE) {
		var winner = (this.chessPosition.getTurnColor() === Chess.PieceColor.WHITE) ? 'Black' : 'White';
		if (confirm(winner + ' wins. Checkmate! Do you want to restart the game?')) {
			this.reset();
		}
	} else if (status !== Chess.Position.Status.NORMAL) {
		if (confirm('The game is a draw. Do you want to restart the game?')) {
			this.reset();
		}
	}
};

Chess.UI.prototype.reset = function() {
	// Reset the chess position to the initial state
	this.chessPosition = new Chess.Position();
	this.updateChessPosition();
};

function makeChessGame() {
	Chess.UI.makeBoard();
	var ui = new Chess.UI;
	ui.updateChessPosition();
}
