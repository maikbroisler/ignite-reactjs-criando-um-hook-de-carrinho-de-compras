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
  
      const [product, stock] = await Promise.all([
        api.get(`/products/${productId}`),
        api.get(`/stock/${productId}`)
      ]);

      const productResponse: Product = product.data;
      const stockResponse: Stock = stock.data;
    
      if(stockResponse.amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productId !== productResponse.id) {
        toast.error('Erro na adição do produto');
        return;
      }

      const productExists = cart.some(product => product.id === productId);

      if(!productExists){
        const newProduct = {
          ...productResponse,
          amount: 1
        }

        setCart([...cart, newProduct]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, newProduct]));
        await api.put(`/stock/${productId}`,{ amount: stockResponse.amount - 1 })
        return;  
      }

      const updateProduct = cart.map(product => product.id === productId ? {
        ...product,
        amount: product.amount += 1
      } : product);
      
      setCart(updateProduct);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateProduct));
      await api.put(`/stock/${productId}`,{ amount: stockResponse.amount - 1 })
    } catch {
      toast.error('Erro na adição do produto');
      toast.error('Quantidade solicitada fora de estoque');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const checkProductExists = cart.find(product => product.id === productId);
      
      if(!checkProductExists){
        toast.error('Erro na remoção do produto');
        return;
      }

      // Remove o produto do carrinho
      const cartFiltered = cart.filter(product => product.id !== productId);

      //Atualiza o estado do carrinho e salva no Storage os novos valores
      setCart(cartFiltered);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartFiltered));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if(amount < 1){
        return;
      }

      const { data: stockQuantity } = await api.get(`/stock/${productId}`);
      
      if(stockQuantity.amount < amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      
      const cartUpdated = cart.map(product => product.id === productId ? {
        ...product,
        amount,
      } : product);

      const currentAmountStock = stockQuantity.amount - amount;
  
      setCart(cartUpdated);
      // console.log(cart, cartUpdated)
      // return;
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));
      await api.put(`/stock/${productId}`, { amount: currentAmountStock});
      console.log(cart)
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
