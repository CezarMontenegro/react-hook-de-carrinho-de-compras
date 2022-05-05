import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
 
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      
      // Testa se stock esta vazio.
      const stock = await api.get(`/stock/${productId}`);
      const isStockEmpty = stock.data.amount === 0 ? true : false;
      if (isStockEmpty) {
        toast.error('Quantidade solicitada fora de estoque');
      }

      //Testa se produto já existe no carrinho.
      const product = newCart.find(product => product.id === productId);

      if (!product) {
        const product = await api.get(`/products/${productId}`);

        const newProduct = {
          id: product.data.id,
          title: product.data.title,
          price: product.data.price,
          image: product.data.image,
          amount: 1,
        }
        newCart.push(newProduct);
        setCart(newCart)
      } else {
        // Testa se o stock está vazio.
        const isThereEnoughStock = stock.data.amount <= product.amount ? true : false;
        // // Retorna erro caso stock esteja vazio.
        if (isThereEnoughStock) {
          toast.error('Quantidade solicitada fora de estoque');
          return
        } 
        product.amount = product.amount += 1

        setCart(newCart)
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart];

      const doesProductExist = newCart.some(product => product.id === productId);

      if (!doesProductExist) {
        toast.error('Erro na remoção do produto');
        return
      }

      const updatedCart = newCart.filter(product => product.id !== productId);

      setCart(updatedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const newCart = [...cart];

      const product = newCart.find(product => product.id === productId);
      if (product === undefined) {
        toast.error('Erro na alteração de quantidade do produto');
        return
      }
      if (amount <= 0) {
        return
      }

      const productStock = await api.get(`/stock/${productId}`);
      const isThereEnoughStock = productStock.data.amount <= amount ? true : false;
      if (isThereEnoughStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      product.amount = amount;
      
      
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
