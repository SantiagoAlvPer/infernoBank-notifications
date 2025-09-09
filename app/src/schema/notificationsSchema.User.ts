import joi, { date } from "joi";

export const WelcomeSchema = joi.object({
    id: joi.string().uuid().required(),
    type: joi.string().valid("WELCOME").required(),
    data: joi
        .object({ fullname: joi.string().min(2).max(100).required() })
        .required(),
});

export const UserSchema = joi.object({
    id: joi.string().uuid().required(),
    type: joi.string().valid("USER.LOGIN", "USER.UPDATED").required(),
    data: joi.object({ date: date().required() }).required(),
});

export const cardSchema = joi.object({
    id: joi.string().uuid().required(),
    type: joi.string().valid("CARD.CREATE", "CARD.ACTIVATE").required(),
    data: joi
        .object({
            date: date().required(),
            type: joi.string().valid("CREDIT", "DEBIT").required(),
            amount: joi.number().positive(),
        })
        .required(),
});

export const transactionPurchaseSchema = joi.object({
    id: joi.string().uuid().required(),
    type: joi.string().valid("TRANSACTION.PURCHASE").required(),
    data: joi.object({
        date: date().required(),
        amount: joi.number().positive().required(),
        cardId : joi.string().required(),
        merchant: joi.string().min(2).max(100).required(),
    }).required(),
})

export const transactionSchema = joi.object({
    id: joi.string().uuid().required(),
    type: joi.string().valid("TRANSACTION.SAVE", "TRANSACTION.PAID").required(),
    data: joi.object({
        date: date().required(),
        amount: joi.number().positive().required(),
        merchant: joi.string().min(2).max(100).required(),
    }).required(),
})

export const reportActivitySchema = joi.object({
    id: joi.string().uuid().required(),
    type: joi.string().valid("REPORT.ACTIVITY").required(),
    data: joi.object({
        date: date().required(),
        url: joi.string().uri().required(),
    })
})